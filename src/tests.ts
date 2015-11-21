import { VSCVim } from "./extension"
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
  private _tests: Test[] = []
  private _testState: IndividualTestResults
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
    this._testState.totalTests++
    
    if (a === b) {
      this._testState.passes++
    } else {
      this._testState.fails++
      this._testState.messages.push(`${a} is not equal to ${b}`)
    }
  }
}

export class Tests extends TestHarness {
  constructor(v: VSCVim) {
    super()
    
    this.test("hjkl", () => {
      return this.setText(`
THIS IS ONLY
A TEST.`)
    })
    
    this.runTests()
  }
  
  /**
   * Replaces the entire text of the editor with the passed in text. Intended to be 
   * used like so:
   * 
   * setText(`
REPLACEMENT TEXT STARTS HERE
FIRST NEWLINE IS IGNORED
FOR CONVENIENCE.`)
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
    })
  }
  
  get document(): TextDocument {
    return window.activeTextEditor.document
  }
  
  get editor(): TextEditor {
    return window.activeTextEditor
  }
}