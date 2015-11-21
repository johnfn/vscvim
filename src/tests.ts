import { VSCVim } from "./extension"

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
  test: () => Promise<any>,
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
  
  test(name: string, test: () => Promise<any>): void {
    this._tests.push({ test, name })
  }
  
  /**
   * Run tests in series. Also, berate the world for lack of async/await.
   * 
   * TODO - figure out if I can transpile ES6 to ES5.
   * TODO - Accept non promised tests. Don't care right now. 
   */
  runTests(): Promise<any> {
    const testListCopy = this._tests.slice()
    
    const iterate: () => Promise<any> = () => {
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
      }).catch((err) => {
        console.log("STOP REJECTING PROMISES IN TESTING YOU IDIOT")
        console.log(JSON.stringify(err))
        console.log(err.stack)
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
    
    this.test("simple", () => {
      this.shouldEqual(1, 1)
      this.shouldEqual("a", "a")
      
      return Promise.resolve(0)
    })
    
    this.test("dumb", () => {
      this.shouldEqual(1, 1)
      this.shouldEqual(0, 0)
            
      return Promise.resolve(0)
    })
    
    this.runTests()
  }
}