/// <reference path="../typings/vscode-typings.d.ts" />

import { VSCVim } from "./vscvim"
import {
  Selection,
  Position,
  window,
  TextDocument,
  TextEditor,
  Range
} from 'vscode';

interface IndividualTestResults {
  totalTests : number
  passes     : number
  fails      : number
  messages   : string[]
}

console.log("Test ")

interface OverallTestResults {
  totalTests             : number
  passes                 : number
  fails                  : number
  failedTestDescriptions : string[]
}

interface Test {
  test: () => PromiseLike<any>,
  name: string,
}


class TestHarness {
  /**
   * Every test.
   */
  private _tests: Test[] = []

  /**
   * State of the active test.
   */
  private _testState: IndividualTestResults

  /**
   * Summary state of all tests.
   */
  private _overallTestState: OverallTestResults = {
    totalTests             : 0,
    passes                 : 0,
    fails                  : 0,
    failedTestDescriptions : []
  }

  private newTestState(): IndividualTestResults {
    return {
      totalTests : 0,
      passes     : 0,
      fails      : 0,
      messages   : []
    }
  }

  test(name: string, test: () => PromiseLike<any>): void {
    this._tests.push({ test, name })
  }

  /**
   * Run tests in series. Also, berate the world for lack of async/await.
   *
   * TODO - figure out if I can transpile ES6 to ES5.
   * TODO - Accept non promised tests. Don't care right now.
   */
  runTests(): PromiseLike<any> {
    const testListCopy = this._tests.slice()

    const iterate: () => PromiseLike<any> = () => {
      if (testListCopy.length === 0) {
        console.log(`OVERALL: ${ this._overallTestState.passes }/${ this._overallTestState.totalTests } tests passing.`)

        if (this._overallTestState.passes === this._overallTestState.totalTests) {
          console.log(`Woohoo!`)
        } else {
          for (const msg of this._overallTestState.failedTestDescriptions) {
            console.log(msg)
          }
        }

        return
      }

      this._testState = this.newTestState()

      const currentTest = testListCopy.shift()
      return currentTest.test().then(() => {
        this._overallTestState.totalTests++

        if (this._testState.passes === this._testState.totalTests) {
          this._overallTestState.passes++
        } else {
          this._overallTestState.failedTestDescriptions.push(currentTest.name + ": \n\n" + this._testState.messages.join("\n") + "\n")

          this._overallTestState.fails++
        }

        return iterate()
      })
    }

    return iterate()
  }

  shouldEqual<T>(a: T, b: T): void {
    let passes = false;
    let message = ""

    this._testState.totalTests++

    if (a instanceof Position) {
      // TODO: How come type guards don't work?
      passes = (<Position> <any> a).isEqual(<Position> <any> b)

      if (!passes) {
        message = `${JSON.stringify(a)} is not equal to ${JSON.stringify(b)}`
      }
    } else {
      passes = (a === b)

      message = `${a} is not equal to ${b}`
    }

    if (passes) {
      this._testState.passes++
    } else {
      const stackTrace = new Error().stack.split("\n").slice(2).join("\n")
      this._testState.fails++

      this._testState.messages.push(message + "\n" + stackTrace)
    }
  }
}

export class Tests extends TestHarness {
  private v: VSCVim;

  constructor(v: VSCVim) {
    super()

    this.v = v;

    this.test("hjkl motions", async () => {
      await this.setText(`
TEST
TEST
TEST
TEST`)

      /* test l and h */

      await v.sendKey("l")
      this.shouldEqual(this.editor.selection.start, new Position(0, 1))

      await v.sendKey("h")
      this.shouldEqual(this.editor.selection.start, new Position(0, 0))

      /* test j and k */

      await v.sendKey("j")
      this.shouldEqual(this.editor.selection.start, new Position(1, 0))

      await v.sendKey("k")
      this.shouldEqual(this.editor.selection.start, new Position(0, 0))

      /* check h edge condition */

      for (let i = 0; i < 10; i++) await v.sendKey("h")
      this.shouldEqual(this.editor.selection.start, new Position(0, 0))

      /* check l edge condition */

      for (let i = 0; i < 10; i++) await v.sendKey("l")
      this.shouldEqual(this.editor.selection.start, new Position(0, 3))

      this.resetSelection()

      /* check j edge condition */

      for (let i = 0; i < 10; i++) await v.sendKey("j")
      this.shouldEqual(this.editor.selection.start, new Position(3, 0))

      /* check k edge condition */

      for (let i = 0; i < 10; i++) await v.sendKey("k")
      this.shouldEqual(this.editor.selection.start, new Position(0, 0))
    })

    this.test("wb motions", async () => {
      await this.setText(`
0 23 567 9
0 2 4 6

01 3456`)

      /* the location of the start of every word. */

      const wordStartLocations = [
        [0, 0], [0, 2], [0, 5], [0, 9],
        [1, 0], [1, 2], [1, 4], [1, 6],
        [2, 0],
        [3, 0], [3, 3], [3, 6]
      ].map(([l, c]) => new Position(l, c))

      /* test w (skip the first position since we're already on it) */
      for (const pos of wordStartLocations.slice(1)) {
        await v.sendKey("w")
        this.shouldEqual(this.cursor, pos)
      }

      /* test b by going in reverse (skip the last position for the same reason) */
      for (const pos of wordStartLocations.reverse().slice(1)) {
        await v.sendKey("b")
        this.shouldEqual(this.cursor, pos)
      }
    })

    this.test("dw", async () => {
      await this.setText(`
abde efg hgi

jklm`)
      await v.sendKey("d")
      await v.sendKey("w")

      this.shouldEqual(this.document.getText(), `efg hgi\n\njklm`)
    })

    this.runTests()
  }

  /**
   * Convenience method to get the location of the cursor (assuming there is no selection)
   */
  get cursor(): Position {
    return this.editor.selection.start
  }

  /**
   * Sets the position of the cursor to (0, 0).
   */
  resetSelection(): void {
    this.editor.selection = new Selection(new Position(0, 0), new Position(0, 0))
    this.v.resetCursor()
  }

  /**
   * Replaces the entire text of the editor with the passed in text. Intended to be
   * used like so:
   *
   * setText(`
REPLACEMENT TEXT STARTS HERE
FIRST NEWLINE IS IGNORED
FOR CONVENIENCE.`)
   *
   * Always sets the cursor location to (0, 0) when finished.
   *
   */
  setText(text: string): PromiseLike<any> {
    const formattedText = text.split("\n").slice(1).join("\n")
    return this.editor.edit(e => {
      e.delete(new Range(new Position(0, 0),
                         new Position(this.document.lineCount - 1,
                                      this.document.lineAt(this.document.lineCount - 1).text.length)))
    }).then(res => {
      return this.editor.edit(e => {
        e.insert(new Position(0, 0), formattedText)
      })
    }).then(res => {
      this.resetSelection()
    })
  }

  get document(): TextDocument {
    return window.activeTextEditor.document
  }

  get editor(): TextEditor {
    return window.activeTextEditor
  }
}