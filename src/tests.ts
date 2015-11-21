import { VSCVim } from "./extension"

interface IndividualTestResults {
  totalTests : number;
  passes     : number;
  fails      : number;
  messages   : string[];
}

interface OverallTestResults {
  totalTests : number;
  passes     : number;
  fails      : number;
}

interface Test {
  test: () => Promise<any>,
  name: string,
}

export class Tests {
  private _tests: Test[] = []
  private _testState: IndividualTestResults
  private _overallTestState: OverallTestResults = {
    totalTests : 0,
    passes     : 0,
    fails      : 0
  }
  
  constructor(v: VSCVim) {
    this.test("simple", () => {
      console.log("hello")
      
      this.shouldEqual(1, 1)
      this.shouldEqual("a", "a")
      
      return Promise.resolve(0)
    })
    
    this.test("dumb", () => {
      this.shouldEqual(1, 1)
      this.shouldEqual(55, 0)
            
      return Promise.resolve(0)
    })
    
    this.runTests()
  }
  
  newTestState(): IndividualTestResults {
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
   * Run tests in series. Also, berate the world for lack of promises.
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
        }
        
        return  
      }
      
      this._testState = this.newTestState()
      
      const nextTest = testListCopy.shift()
      return nextTest.test().then(() => {
        this._overallTestState.totalTests++
        
        if (this._testState.passes === this._testState.totalTests) {
          console.log(`pass ${nextTest.name}`)
          this._overallTestState.passes++
        } else {
          console.error(`FAIL ${nextTest.name}`)
          console.error(``)
          
          for (const message of this._testState.messages) {
            console.error(message)
          }
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
    }
  }
}
