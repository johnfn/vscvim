/// <reference path="../typings/vscode-typings.d.ts" />

// TODO
// * {operator}w is special cased when you're on the last word of a line. It won't go to the next line.
// * The other hard thing I should start thinking about is .
//   * Should not actually be _too_ hard since I could just save a reference to the previous state.
//   * (And macros could be done by saving all states)

import * as vscode from 'vscode';
import { Tests } from "./tests"

class VimAction {
  public modes: VimMode[]
  public key: string

  constructor() { }

  doesActionApply(state: VimState, key: string): boolean {
    if (this.modes.indexOf(state.mode) === -1) return false;
    if (this.key.indexOf(key) === -1)          return false;

    return true;
  }

  runAction(state: VimState): VimState {
    throw new Error("No action to run.");
  }
}

class VimAction_h extends VimAction {
  modes = [VimMode.Normal, VimMode.Visual];
  key  = "h";

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.textAction = new TextMotionMovement(MovementDirection.Left, 1)
    return newState
  }
}

class VimAction_l extends VimAction {
  modes = [VimMode.Normal, VimMode.Visual];
  key  = "l";

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.textAction = new TextMotionMovement(MovementDirection.Right, 1)
    return newState
  }
}

class VimAction_j extends VimAction {
  modes = [VimMode.Normal, VimMode.Visual];
  key  = "j";

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.textAction = new TextMotionMovement(MovementDirection.Down, 1)
    return newState
  }
}

class VimAction_k extends VimAction {
  modes = [VimMode.Normal, VimMode.Visual]
  key  = "k"

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.textAction = new TextMotionMovement(MovementDirection.Up, 1)
    return newState
  }
}

class VimAction_i extends VimAction {
  modes = [VimMode.Normal]
  key  = "i"

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.mode = VimMode.Insert
    return newState
  }
}

class VimAction_v extends VimAction {
  modes = [VimMode.Normal]
  key  = "v"

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.mode        = VimMode.Visual
    newState.cursorStart = state.cursor
    return newState
  }
}

class VimAction_escape extends VimAction {
  modes = [VimMode.Insert, VimMode.Visual]
  key  = "escape"

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.mode = VimMode.Normal
    return newState
  }
}

class VimAction_d extends VimAction {
  modes = [VimMode.Normal, VimMode.Visual]
  key = "d"

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.command = new VimOperatorDelete()
    return newState
  }
}

class VimAction_c extends VimAction {
  modes = [VimMode.Normal]
  key = "c"

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.command = new VimOperatorChange()
    return newState
  }
}

class VimAction_w extends VimAction {
  modes = [VimMode.Normal, VimMode.Visual]
  key = "w"

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.textAction = new TextMotionWord({ forward: true })
    return newState
  }
}

class VimAction_b extends VimAction {
  modes = [VimMode.Normal, VimMode.Visual]
  key = "b"

  runAction(state: VimState): VimState {
    const newState = clone(state)
    newState.textAction = new TextMotionWord({ forward: false })
    return newState
  }
}

class Keys {

  // TODO: Use a decorator rather than being literally idiotic
  public static actions: VimAction[] = [
    new VimAction_i(),
    new VimAction_h(),
    new VimAction_l(),
    new VimAction_j(),
    new VimAction_k(),
    new VimAction_d(),
    new VimAction_w(),
    new VimAction_b(),
    new VimAction_v(),
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
function clone<T>(obj: T): T {
  if(obj === null || typeof(obj) !== 'object' || 'isActiveClone' in obj)
    return obj;

  var result: T = Object.setPrototypeOf({}, Object.getPrototypeOf(obj));

  for (var key in obj) {
    if(Object.prototype.hasOwnProperty.call(obj, key)) {
      (obj as any)['isActiveClone'] = null;
      (result as any)[key] = clone((obj as any)[key]);
      delete (obj as any)['isActiveClone'];
    }
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
  /**
   * Which mode we're in.
   */
  mode          : VimMode;

  /**
   * Which operator we're going to apply (e.g. change, delete, indent left)
   */
  command       : VimOperator;

  /**
   * The most recent key pressed. (TODO: Not sure if this is necessary).
   */
  mostRecentKey : string;

  /**
   * The text action we're going to apply - will create a new location for the cursor.
   */
  textAction    : TextMotion;

  /**
   * The location of the cursor.
   */
  cursor        : vscode.Position;

  /**
   * This is the location at which you switched into visual mode.
   */
  cursorStart  : vscode.Position;
}

interface TextMotion {
  /**
   * Runs this text motion, returning a position indicating where the
   * text motion is now located.
   */
  runTextMotion(pos: vscode.Position): vscode.Position;
}

class TextMotionMovement implements TextMotion {
  private _direction: MovementDirection;
  private _amount: number;

  constructor(direction: MovementDirection, amount: number) {
    this._direction = direction;
    this._amount = amount;
  }

  runTextMotion(pos: vscode.Position): vscode.Position {
    const editor = vscode.window.activeTextEditor;

    // 1 + 2 === 2 ? 1 : 77
    // What would it evaluate to? Go ahead, think about it.

    if (this._direction === MovementDirection.Left || this._direction === MovementDirection.Right) {
      let newchar = pos.character + (this._direction === MovementDirection.Left ? -1 : 1)
      newchar     = Util.constrain(newchar, 0, editor.document.lineAt(pos.line).text.length - 1)

      return new vscode.Position(pos.line, newchar)
    } else if (this._direction === MovementDirection.Up || this._direction === MovementDirection.Down) {
      let newline = pos.line + (this._direction === MovementDirection.Up ? -1 : 1)
      newline     = Util.constrain(newline, 0, editor.document.lineCount - 1)

      return new vscode.Position(newline, pos.character)
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
  public static forEachChar(cb            : ForEachCharItr,
                            startPosition : vscode.Position = Util.editor.selection.start,
                            forward       : boolean         = true)
                                          : vscode.Position {
    let stopped     = false
    const done      = () => stopped = true

    let currentPos  = startPosition
    let currentLine = () => Util.document.lineAt(currentPos.line).text
    let currentChar = () => currentLine()[currentPos.character]

    while (true) {
      let previousPos = currentPos

      cb(currentPos, currentChar(), done)

      if (stopped) break

      currentPos = forward ? Util.nextPosition(currentPos) : Util.prevPosition(currentPos)

      // Did we just iterate over a newline?
      if ((forward  && currentPos.character === 0) ||
          (!forward && currentPos.character === currentLine().length)) {
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

  runTextMotion(): vscode.Position {
    const editor        = vscode.window.activeTextEditor
    let   nextWordPosition;

    if (this._forward) {
      let seenDelimiter = false

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


    return nextWordPosition
  }
}

class VimOperator {
  constructor() {

  }

  async runOperator(state: VimState, start: vscode.Position, end: vscode.Position): Promise<VimState> {
    throw "unimplemented";
  }
}

class VimOperatorDelete implements VimOperator {
  async runOperator(state: VimState, start: vscode.Position, end: vscode.Position): Promise<VimState> {
    const editor = vscode.window.activeTextEditor;
    const range  = new vscode.Range(start, end);

    await editor.edit((e: vscode.TextEditorEdit) => {
      e.delete(range);
    });

    return state;
  }
}

class VimOperatorChange implements VimOperator {
  async runOperator(state: VimState, start: vscode.Position, end: vscode.Position): Promise<VimState> {
    const editor = vscode.window.activeTextEditor;
    const range  = new vscode.Range(start, end);

    await editor.edit((e: vscode.TextEditorEdit) => {
      e.delete(range);
    });

    const newState = clone(state)
    newState.mode = VimMode.Insert
    return newState
  }
}

export class VSCVim {
  state: VimState;

  constructor() {
    this.state = {
      mode          : VimMode.Normal,
      mostRecentKey : "",
      textAction    : null,
      cursor        : vscode.window.activeTextEditor.selection.start,
      cursorStart   : null,
      command       : null // TODO: Use Maybe<T>?
    }

    VSCVim.instance = this
    if (VSCVim.onInstanceChanged) VSCVim.onInstanceChanged()
  }

  private updateStatusBar(state: VimState): void {
    let status: string;

    switch (state.mode) {
      case VimMode.Insert: status = "INSERT MODE"; break
      case VimMode.Normal: status = "NORMAL MODE"; break
      case VimMode.Visual: status = "VISUAL MODE"; break
      default:             status = "??? MODE";    break
    }

    vscode.window.setStatusBarMessage(status)
  }

  private showErrorMessage(msg: string): void {
    vscode.window.showErrorMessage(`[VSCVim]: ${msg}`)
  }

  private runSanityChecks(state: VimState): void {
    const editor = vscode.window.activeTextEditor

    if (!this.truncatePosition(state.cursor).isEqual(editor.selection.end)) {
      console.log("cursor is ", state.cursor)
      console.log("sel is ", editor.selection.start, editor.selection.end);

      this.showErrorMessage("DESYNCHRONY BETWEEN CURSOR AND REALITY. CALL THE POLICE IMMEDIATELY")
    }
  }

  /**
   * Given the key that was pressed and the current VimState,
   * returns a new VimState. Also returns a boolean which indicates
   * whether any change was made to the state.
   */
  private applyKeystrokeToState(state: VimState, key: string): [VimState, boolean] {
    let newState    = state
    let didKeyApply = false

    for (const action of Keys.actions) {
      if (action.doesActionApply(newState, key)) {
        if (didKeyApply) {
          this.showErrorMessage("[VSCVIM ERROR] More than 1 key applied");
        }

        newState = action.runAction(newState);

        didKeyApply = true;
      }
    }

    return [newState, didKeyApply]
  }

  /**
   * Given a VimState in Normal mode, determine if the user has entered a full
   * Vim command, and if so, update the state accordingly.
   */
  private async tryToRunStateInNormalMode(state: VimState): Promise<boolean> {
    if (!state.textAction) return false

    const newPosition = state.textAction.runTextMotion(state.cursor)

    if (state.command) {
      await state.command.runOperator(state, state.cursor, newPosition)
    } else {
      state.cursor = newPosition
    }

    return true
  }

  /**
   * Given a VimState in Visual mode, determine if the user has entered a full
   * Vim command, and if so, update the state accordingly.
   */
  private async tryToRunStateInVisualMode(state: VimState): Promise<boolean> {
    if (state.textAction) {
      const newPosition = state.textAction.runTextMotion(state.cursor)
      state.cursor = newPosition
    }

    if (state.command) {
      await state.command.runOperator(state, state.cursorStart, state.cursor)
      state.mode = VimMode.Normal

      state.cursor = state.cursorStart
    }

    return true
  }

  private giganticHackForUnusedKeys(key: string): void {
      // TODO: This is a total hack because I don't currently know the correct way
      // to ignore keystrokes.

      if (["escape"].indexOf(key) === -1) {
        vscode.window.activeTextEditor.edit((e: vscode.TextEditorEdit) => {
          e.insert(Util.editor.selection.start, key)
        });
      }
  }

  /**
   * The method that starts it all in VSCVim. Given a keystroke input,
   * updates the inner state and, if necessary, the editor accordingly.
   */
  async sendKey(key: string): Promise<{}> {
    const editor = vscode.window.activeTextEditor

    this.runSanityChecks(this.state)

    const [newState, didKeyApply] = this.applyKeystrokeToState(this.state, key)

    if (!didKeyApply) {
      this.giganticHackForUnusedKeys(key)
      return
    }

    let couldRunState = false

    switch (newState.mode) {
      case VimMode.Normal: couldRunState = await this.tryToRunStateInNormalMode(newState); break
      case VimMode.Visual: couldRunState = await this.tryToRunStateInVisualMode(newState); break
      default: break
    }

    if (couldRunState) {
      // Reset state for next action.

      newState.textAction = null
      newState.command    = null
    }

    // Operations done. Keep the editor in sync with the state.
    if (newState.mode === VimMode.Normal) {
      editor.selection = new vscode.Selection(newState.cursor, newState.cursor)
    }

    if (newState.mode === VimMode.Visual) {
      editor.selection = new vscode.Selection(newState.cursorStart, newState.cursor)
    }

    this.updateStatusBar(newState)

    this.state = newState;
  }

  /**
   * Given a position p which might have a character field past the
   * length of the line, returns a valid position p. Really just
   * used for some validations and not generally helpful, since
   * vscode does not choke on positions like that.
   */
  private truncatePosition(p: vscode.Position): vscode.Position {
    let newPosition = p
    const editor = vscode.window.activeTextEditor

    if (p.character > editor.document.lineAt(p.line).text.length) {
      const newCh = editor.document.lineAt(p.line).text.length
      newPosition = new vscode.Position(p.line, newCh)
    }

    return newPosition
  }


  // For testing only. //

  private static instance: VSCVim;

  private static onInstanceChanged: () => void;

  /**
   * The running instance of VSCVim. I don't condone the usage of this. I only
   * use it for testing.
   */
  public static getInstance(cb: (i: VSCVim) => void): void {
    if (VSCVim.instance)             cb(VSCVim.instance);
    VSCVim.onInstanceChanged = () => cb(VSCVim.instance)
  }

  /**
   * THIS SHOULD ONLY BE USED FOR TESTING.
   *
   * Reset cursor back to (0, 0).
   */
  public resetCursor(): void {
    const topleft = new vscode.Position(0, 0)

    this.state.cursor = topleft
    vscode.window.activeTextEditor.selection = new vscode.Selection(topleft, topleft)
  }
}