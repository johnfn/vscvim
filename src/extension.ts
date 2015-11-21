// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'; 

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
	
	const keys: string[] = ["i", "escape", "h", "l", "d", "c"];
	const disposables: vscode.Disposable[] = keys.map((key: string) => {
		return vscode.commands.registerCommand(`extension.press_${key}`, () => {	
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


  var result: T = <any> {};
  Object.setPrototypeOf(result, Object.getPrototypeOf(obj));

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

const enum Keys {
	escape,
	i,
	h,
	l
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
	runTextAction(): vscode.Selection;
}

class TextMotionMovement implements TextMotion {
	private _direction: MovementDirection;
	private _amount: number;
	
	constructor(direction: MovementDirection, amount: number) {
		this._direction = direction;
		this._amount = amount;
	}
	
	runTextAction(): vscode.Selection {
		const editor = vscode.window.activeTextEditor; 
		
		const pos = editor.selection.start;
		
		const delta = this._direction === MovementDirection.Left ? -1 : 1;
		
		const start = new vscode.Position(pos.line, pos.character + delta);
		const end   = new vscode.Position(pos.line, pos.character + delta);
		
		return new vscode.Selection(start, end)
	}
}

class VimAction {
	protected modes: VimMode[] = [];
	protected keys: string[] = [];
	
	constructor() {	}
	
	doesActionApply(state: VimState): boolean {
		if (this.modes.indexOf(state.mode) === -1)      return false;
		if (this.keys.indexOf(state.mostRecentKey) === -1) return false;
		
		return true;
	}
	
	runAction(state: VimState): VimState {
		throw new Error("No action to run.");
	}
}

class VimActionH extends VimAction {
	modes = [VimMode.Normal];
	keys  = ["h"];
	
	runAction(state: VimState): VimState {
		return clone(state, {
			textAction: new TextMotionMovement(MovementDirection.Left, 1)
		});
	}
}

class VimActionL extends VimAction {
	modes = [VimMode.Normal];
	keys  = ["l"];
	
	runAction(state: VimState): VimState {
		return clone(state, {
			textAction: new TextMotionMovement(MovementDirection.Right, 1)
		});
	}
}

class VimActionI extends VimAction {
	modes = [VimMode.Normal];
	keys  = ["i"];
	
	runAction(state: VimState): VimState {
		return clone(state, {
			mode: VimMode.Insert
		});
	}
}

class VimActionEscape extends VimAction {
	modes = [VimMode.Insert];
	keys  = ["escape"];
	
	runAction(state: VimState): VimState {
		return clone(state, {
			mode: VimMode.Normal
		});
	}
}

class VimActionD extends VimAction {
	modes = [VimMode.Normal];
	keys = ["d"];
	
	runAction(state: VimState): VimState {
		return clone(state, {
			command: new VimOperatorDelete()
		});
	}
}

class VimActionC extends VimAction {
	modes = [VimMode.Normal];
	keys = ["c"];
	
	runAction(state: VimState): VimState {
		return clone(state, {
			command: new VimOperatorChange()
		});
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
		
		// TODO: Auto-register (w/ decorators)
		this.actions = [
			new VimActionI(),
			new VimActionEscape(),
			new VimActionH(),
			new VimActionL(),
			new VimActionD(),
			new VimActionC()
		];
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
		
		for (const action of this.actions) {
			if (action.doesActionApply(newState)) {
				if (didKeyApply) {
					console.warn("WARNING: More than 1 key applied.");
				}
				
				newState = action.runAction(newState);
				
				didKeyApply = true;
			}
		}
		
		if (newState.textAction) {
			const newPosition = newState.textAction.runTextAction().start;
			const oldPosition = vscode.window.activeTextEditor.selection.start;
			
			newState.command.runOperator(newState, oldPosition, newPosition);
			
			// vscode.window.activeTextEditor.selections = [newPosition];
			
			// Clear out vim state
			
			newState.textAction = null;
			newState.command = new VimOperatorMove();
		}

		this.state = newState;
		
		this.updateStatusBar()
	}
}