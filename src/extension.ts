// TODO
// * Fix errors when text actions (hjkl etc) go off side of screen
// * Need to start thinking about visual mode immediately
//   * Making way too many assumptions about selections currently, only gonna get worse.
// * The other hard thing I should start thinking about is .
//   * Should not actually be _too_ hard since I could just save a reference to the previous state.
//   * (And macros could be done by saving all states)

import * as vscode from 'vscode'; 
import { Tests } from "./tests"

class VimAction {
	public modes: VimMode[];
	public key: string;
  public insertsKey: string;
	
	constructor() {	}
	
	doesActionApply(state: VimState): boolean {
		if (this.modes.indexOf(state.mode) === -1)        return false;
		if (this.key.indexOf(state.mostRecentKey) === -1) return false;
		
		return true;
	}
	
	runAction(state: VimState): VimState {
		throw new Error("No action to run.");
	}
}

class VimAction_h extends VimAction {
	modes = [VimMode.Normal];
	key  = "h";
	
	runAction(state: VimState): VimState {
		return clone(state, {
			textAction: new TextMotionMovement(MovementDirection.Left, 1)
		});
	}
}

class VimAction_l extends VimAction {
	modes = [VimMode.Normal];
	key  = "l";
	
	runAction(state: VimState): VimState {
		return clone(state, {
			textAction: new TextMotionMovement(MovementDirection.Right, 1)
		});
	}
}

class VimAction_j extends VimAction {
	modes = [VimMode.Normal];
	key  = "j";
	
	runAction(state: VimState): VimState {
		return clone(state, {
			textAction: new TextMotionMovement(MovementDirection.Down, 1)
		});
	}
}

class VimAction_k extends VimAction {
	modes = [VimMode.Normal];
	key  = "k";
	
	runAction(state: VimState): VimState {
		return clone(state, {
			textAction: new TextMotionMovement(MovementDirection.Up, 1)
		});
	}
}

class VimAction_i extends VimAction {
	modes = [VimMode.Normal];
	key  = "i";
	
	runAction(state: VimState): VimState {
		return clone(state, {
			mode: VimMode.Insert
		});
	}
}

class VimAction_escape extends VimAction {
	modes = [VimMode.Insert];
	key  = "escape";
	
	runAction(state: VimState): VimState {
		return clone(state, {
			mode: VimMode.Normal
		});
	}
}

class VimAction_d extends VimAction {
	modes = [VimMode.Normal];
	key = "d";
	
	runAction(state: VimState): VimState {
		return clone(state, {
			command: new VimOperatorDelete()
		});
	}
}

class VimAction_c extends VimAction {
	modes = [VimMode.Normal];
	key = "c";
	
	runAction(state: VimState): VimState {
		return clone(state, {
			command: new VimOperatorChange()
		});
	}
}

class VimAction_w extends VimAction {
	modes = [VimMode.Normal];
	key = "w";
	
	runAction(state: VimState): VimState {
		return clone(state, {
			textAction: new TextMotionWord({ forward: true })
		});
	}
}

class VimAction_b extends VimAction {
	modes = [VimMode.Normal];
	key = "b";
	
	runAction(state: VimState): VimState {
		return clone(state, {
			textAction: new TextMotionWord({ forward: false })
		});
	}
}

class Keys {
	public static actions: VimAction[] = [
		new VimAction_i(),
		new VimAction_h(),
		new VimAction_l(),
		new VimAction_j(),
		new VimAction_k(),
		new VimAction_d(),
    new VimAction_w(),
    new VimAction_b(),
		new VimAction_escape()
	];
	
	public static keyNames(): string[] {
		return Keys.actions.map(action => action.key);
	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscvim" is now active!'); 
	
	VSCVim.getInstance(i => new Tests(i))

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	/*
	const disposable = vscode.commands.registerCommand('extension.sayHello', () => {
		// The code you place here will be executed every time your command is executed

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		
		const selection = editor.selection;
		const text = editor.document.getText(selection)
		
		vscode.window.showInformationMessage("Selected: " + text);

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World!');
	});
	*/
	
	const vim = new VSCVim();
	

	const disposables: vscode.Disposable[] = Keys.keyNames().map((key: string) => {
		return vscode.commands.registerTextEditorCommand(`extension.press_${key}`, () => {	
			vim.sendKey(key);
		});
	});

	// context.subscriptions.push(disposable);
}

/**
  Clone obj, optionally copying over key value pairs from props onto obj.
*/
function clone<T>(obj: T, props: any = {}): T {
  if(obj === null || typeof(obj) !== 'object' || 'isActiveClone' in obj)
    return obj;

  var result: T = Object.setPrototypeOf({}, Object.getPrototypeOf(obj));

  for (var key in obj) {
    if(Object.prototype.hasOwnProperty.call(obj, key)) {
      (obj as any)['isActiveClone'] = null;
      (result as any)[key] = clone((obj as any)[key], {});
      delete (obj as any)['isActiveClone'];
    }
  }

  for (var key in props) {
    (result as any)[key] = props[key];
  }
  
  if (result && obj) {
	  Object.setPrototypeOf(result, Object.getPrototypeOf(obj));
  }

  return result;
}

const enum VimMode {
	Normal,
	Insert,
	Visual,
	VisualLine,
	VisualBlock
}

/*
const enum VimCommand {
	Yank,
	Delete,
	Change,
	Indent,
	Unindent,
	AutoFormat,
	None
}
*/

const enum MovementDirection {
	Up,
	Down,
	Left,
	Right
}

interface VimState {
	mode: VimMode;
	command: VimOperator;
	mostRecentKey: string;
	textAction: TextMotion;
}

interface TextMotion {
  /**
   * Runs this text motion, returning a selection indicating where the
   * text motion is now located.
   */
	runTextMotion(): vscode.Selection;
}

class TextMotionMovement implements TextMotion {
	private _direction: MovementDirection;
	private _amount: number;
	
	constructor(direction: MovementDirection, amount: number) {
		this._direction = direction;
		this._amount = amount;
	}
	
	runTextMotion(): vscode.Selection {
		const editor = vscode.window.activeTextEditor; 
		const pos    = editor.selection.start;
    
    // 1 + 2 === 2 ? 1 : 77
    // What would it evaluate to? Go ahead, think about it.
		
		if (this._direction === MovementDirection.Left || this._direction === MovementDirection.Right) {
			let newchar = pos.character + (this._direction === MovementDirection.Left ? -1 : 1)
      newchar     = Util.constrain(newchar, 0, editor.document.lineAt(pos.line).text.length)
      
			const start = new vscode.Position(pos.line, newchar);
			const end   = new vscode.Position(pos.line, newchar);
			
			return new vscode.Selection(start, end)
		} else if (this._direction === MovementDirection.Up || this._direction === MovementDirection.Down) {
			let newline = pos.line + (this._direction === MovementDirection.Up ? -1 : 1)
      newline     = Util.constrain(newline, 0, editor.document.lineCount)
			
			const start = new vscode.Position(newline, pos.character);
			const end   = new vscode.Position(newline, pos.character);
			
			return new vscode.Selection(start, end)
		}
	}
}

type ForEachCharItr = (pos: vscode.Position, char: string, done: () => void) => void

class Util {
  
  /**
   * Constrain val to be within the range of low and high.
   */
  public static constrain(val: number, low: number, high: number): number {
    if (val > high) return high;
    if (val < low ) return low;
                    return val;
  }
  
  public static get editor(): vscode.TextEditor {
    return vscode.window.activeTextEditor;
  }
  
  public static get document(): vscode.TextDocument {
    return Util.editor.document;
  }
  
  /**
   * TODO: Generators would be nice here.
   * 
   * Iterates over each character in the document, starting from startPosition. Also 
   * shows newlines!
   * 
   * @param startPosition The position to start iterating from (or the current editor's position if null).
   * 
   */
  public static forEachChar(cb: ForEachCharItr, 
                            startPosition: vscode.Position = Util.editor.selection.start,
                            forward: boolean = true): vscode.Position {
    let stopped     = false
    const done      = () => stopped = true
    
    let currentPos  = startPosition
    let currentChar = () => Util.document.lineAt(currentPos.line).text[currentPos.character]
    
    while (true) {
      let previousPos = currentPos
      
      cb(currentPos, currentChar(), done)
      
      if (stopped) break
      
      currentPos = forward ? Util.nextPosition(currentPos) : Util.prevPosition(currentPos)
      if (currentPos.character === 0) {
        cb(currentPos, "\n", done)
        
        if (stopped) break;
      }
      
      // We are at the beginning or end of the document.
      if (currentPos.isEqual(previousPos)) {
        cb(currentPos, "\n", done)
      }
    }
    
    return currentPos
  }
    
  /**
   * Return a position one previous than the passed in position, potentially
   * traversing to the previous line.
   * 
   * TODO: Not sure how to handle beginning.
   */
  public static prevPosition(p: vscode.Position): vscode.Position {
    let newCharPos = p.character;
    let newLinePos = p.line;
    
    newCharPos--;
    
    if (newCharPos < 0) {
      newLinePos--;
           
      if (newLinePos < 0) {
        console.warn(`no clue what to do here...`)
        
        return p
      }
      
      newCharPos = Util.document.lineAt(newLinePos).text.length
    }
    
    return new vscode.Position(newLinePos, newCharPos)
  }

  /**
   * Return a position one after than the passed in position, potentially
   * traversing to the next line.
   * 
   * TODO: Not sure how to handle end.
   */
  public static nextPosition(p: vscode.Position): vscode.Position {
    let newCharPos = p.character;
    let newLinePos = p.line;
    
    newCharPos++;
    
    if (newCharPos >= Util.document.lineAt(newLinePos).text.length) {
      newCharPos = 0
      newLinePos++
      
      if (newLinePos >= Util.document.lineCount) {
         console.warn(`also no clue what to do here...`)
         
         return p
      }
    }
    
    return new vscode.Position(newLinePos, newCharPos)
  }
}

class TextMotionWord implements TextMotion {
  private _forward: boolean;
  
  private static wordDelimiters = " \n";
  
  private static isDelimiter(char: string): boolean {
    return TextMotionWord.wordDelimiters.indexOf(char) !== -1;
  }
  
  constructor(params: { forward: boolean }) {
    this._forward = params.forward;
  }
  
  runTextMotion(): vscode.Selection {
    const editor        = vscode.window.activeTextEditor
    let   seenDelimiter = false
    let nextWordPosition;
    
    if (this._forward) { 
      nextWordPosition = Util.forEachChar((pos, char, done) => {
        if (TextMotionWord.isDelimiter(char)) {
          seenDelimiter = true
        } else if (seenDelimiter) {
          return done()
        }
      })
    } else {
      let hasSeenNonDelimiter = false
      const startingPosition  = Util.prevPosition(Util.editor.selection.start)
      
      Util.forEachChar((pos, char, done) => {        
        if (TextMotionWord.isDelimiter(char)) {
          if (hasSeenNonDelimiter) {
            return done()
          }
        } else {
          nextWordPosition    = pos
          hasSeenNonDelimiter = true
        }
      }, startingPosition, false)
    }

    
    return new vscode.Selection(nextWordPosition, nextWordPosition);
  }
}

class VimOperator {
	constructor() {
		
	}
	
	runOperator(state: VimState, start: vscode.Position, end: vscode.Position): VimState {
		throw "unimplemented";
	}
}

class VimOperatorDelete implements VimOperator {
	runOperator(state: VimState, start: vscode.Position, end: vscode.Position): VimState {
		const editor = vscode.window.activeTextEditor;
		const range  = new vscode.Range(start, end);
		
		editor.edit((e: vscode.TextEditorEdit) => {
			e.delete(range);
		});
		
		return state;
	}
}

class VimOperatorChange implements VimOperator {
	runOperator(state: VimState, start: vscode.Position, end: vscode.Position): VimState {
		const editor = vscode.window.activeTextEditor;
		const range  = new vscode.Range(start, end);
		
		editor.edit((e: vscode.TextEditorEdit) => {
			e.delete(range);
		});
		
		return clone(state, {
			mode: VimMode.Insert
		});
	}
}

class VimOperatorMove implements VimOperator {
	runOperator(state: VimState, start: vscode.Position, end: vscode.Position): VimState {
		const editor = vscode.window.activeTextEditor;
		const range  = new vscode.Range(start, end);
		
		editor.selections = [new vscode.Selection(end, end)];
		
		return state;
	}
}

export class VSCVim {
	state: VimState;
	
	constructor() {
		this.state = {
			mode          : VimMode.Normal,
			mostRecentKey : "",
			textAction    : null,
			command       : new VimOperatorMove()
		}
    
    VSCVim.instance = this
    if (VSCVim.onInstanceChanged) VSCVim.onInstanceChanged()
	}
	
	updateStatusBar(): void {
		let status: string;
		
		switch (this.state.mode) {
			case VimMode.Insert: status = "INSERT MODE"; break;
			case VimMode.Normal: status = "NORMAL MODE"; break;
			default:             status = "??? MODE";    break;
		}
		
		vscode.window.setStatusBarMessage(status)
	}
	
	sendKey(key: string): void {
		let newState = clone(this.state, {
			mostRecentKey: key
		});
		let didKeyApply = false;
		const editor = vscode.window.activeTextEditor;
		
		for (const action of Keys.actions) {
			if (action.doesActionApply(newState)) {
				if (didKeyApply) {
					vscode.window.showErrorMessage("[VSCVIM ERROR] More than 1 key applied");
				}
				
				newState = action.runAction(newState);
				
				didKeyApply = true;
			}
		}
		
		if (!didKeyApply) {
			vscode.window.activeTextEditor.edit((e: vscode.TextEditorEdit) => {
				e.insert(editor.selection.start, key)
			});
		} else {
			if (newState.textAction) {
				const newPosition = newState.textAction.runTextMotion().start;
				const oldPosition = vscode.window.activeTextEditor.selection.start;
				
				newState.command.runOperator(newState, oldPosition, newPosition);
				
				// vscode.window.activeTextEditor.selections = [newPosition];
				
				// Clear out vim state
				
				newState.textAction = null;
				newState.command = new VimOperatorMove();
			}		
		}
		

		this.state = newState;
		
		this.updateStatusBar()
	}
  
  // For testing only. //
    

  private static instance: VSCVim;
  
  private static onInstanceChanged: () => void;
  
  /**
   * The running instance of VSCVim. I don't condone the usage of this. I only
   * use it for testing. 
   */
  public static getInstance(cb: (i: VSCVim) => void): void {
    if (VSCVim.instance) cb(VSCVim.instance);
    VSCVim.onInstanceChanged = () => cb(VSCVim.instance)
  }
}