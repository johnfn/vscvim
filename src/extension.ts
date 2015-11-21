// TODO
// * Fix errors when text actions (hjkl etc) go off side of screen

import * as vscode from 'vscode'; 

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

class Keys {
	public static actions: VimAction[] = [
		new VimAction_i(),
		new VimAction_h(),
		new VimAction_l(),
		new VimAction_j(),
		new VimAction_k(),
		new VimAction_d(),
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
	
	const vim: Vim = new Vim();
	

	const disposables: vscode.Disposable[] = Keys.keyNames().map((key: string) => {
		return vscode.commands.registerTextEditorCommand(`extension.press_${key}`, () => {	
			vim.keyWasPressed(key);
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
		
		if (this._direction === MovementDirection.Left || this._direction === MovementDirection.Right) {
			const delta = this._direction === MovementDirection.Left ? -1 : 1;
			
			const start = new vscode.Position(pos.line, pos.character + delta);
			const end   = new vscode.Position(pos.line, pos.character + delta);
			
			return new vscode.Selection(start, end)
		} else if (this._direction === MovementDirection.Up || this._direction === MovementDirection.Down) {
			const delta = this._direction === MovementDirection.Up ? -1 : 1;
			
			const start = new vscode.Position(pos.line + delta, pos.character);
			const end   = new vscode.Position(pos.line + delta, pos.character);
			
			return new vscode.Selection(start, end)
		}
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

class Vim {
	state: VimState;
	actions: VimAction[] = [];
	
	constructor() {
		this.state = {
			mode: VimMode.Normal,
			mostRecentKey: "",
			textAction: null,
			command: new VimOperatorMove()
		};
	}
	
	updateStatusBar(): void {
		let status: string;
		
		switch (this.state.mode) {
			case VimMode.Insert: status = "INSERT MODE"; break;
			case VimMode.Normal: status = "NORMAL MODE"; break;
			default: status = "??? MODE"; break;
		}
		
		vscode.window.setStatusBarMessage(status)
	}
	
	keyWasPressed(key: string): void {
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
}