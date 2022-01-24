import { OK, FAIL } from './index'

export const sudo = {
  Sudid: class Event {
    name = 'sudo.Sudid'
    lookupName = 'Result<Null, SpRuntimeDispatchError>'
    lookupIndex = 56

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()
      let result = data.isOk ? OK : FAIL

      if (result === FAIL) {
        callback = () => { process.exit(0) }
      }

      process.stdout.write(`${result}-${this.name}-${reason}\n`, () => {
        callback(); 
      })
    }
  }
}

export const system = {
  ExtrinsicFailed: class Event {
    name = 'system.ExtrinsicFailed'
    lookupName = 'SpRuntimeDispatchError'
    // lookupIndex = 56

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()

      process.stdout.write(`${FAIL}-${this.name}-${reason}\n`, () => {
        callback(); 
      })
    }
  }
}

export const assets = {
  Created: class Event {
    name = 'assets.Created'
    lookupName = 'u32'
    lookupIndex = 4

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()

      process.stdout.write(`${OK}-${this.name}-asset_id: ${reason}\n`, () => {
        callback(); 
      })
    }
  },
  MetadataSet: class Event {
    name = 'assets.MetadataSet'
    lookupName = 'Bytes'
    lookupIndex = 10

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toHuman()

      process.stdout.write(`${OK}-${this.name}-name: ${reason}\n`, () => {
        callback(); 
      })
    }
  },
  Issued: class Event {
    name = 'assets.Issued'
    lookupName = 'u128'
    lookupIndex = 6

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()

      process.stdout.write(`${OK}-${this.name}-amount: ${reason}\n`, () => {
        callback(); 
      })
    }
  },
  Transferred: class Event {
    name = 'assets.Transferred'
    lookupName = 'u128'
    lookupIndex = 6

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()

      process.stdout.write(`${OK}-${this.name}-amount: ${reason}\n`, () => {
        callback(); 
      })
    }
  },
  ForceCreated: class Event {
    name = 'assets.ForceCreated'
    lookupName = 'u32'
    lookupIndex = 4

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()

      process.stdout.write(`${OK}-${this.name}-asset_id: ${reason}\n`, () => {
        callback(); 
      })
    }
  }
}

export const uniques = {
  Created: class Event {
    name = 'uniques.Created'
    lookupName = 'u32'
    lookupIndex = 4

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()

      process.stdout.write(`${OK}-${this.name}-class_id: ${reason}\n`, () => {
        callback(); 
      })
    }
  },
  MetadataSet: class Event {
    name = 'uniques.MetadataSet'
    lookupName = 'Bytes'
    lookupIndex = 10

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toHuman()

      process.stdout.write(`${OK}-${this.name}-name: ${reason}\n`, () => {
        callback(); 
      })
    }
  },
  Issued: class Event {
    name = 'uniques.Issued'
    lookupName = 'u32'
    lookupIndex = 4

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()

      process.stdout.write(`${OK}-${this.name}-ids: ${reason}\n`, () => {
        callback(); 
      })
    }
  },
  Transferred: class Event {
    name = 'uniques.Transferred'
    lookupName = 'u32'
    lookupIndex = 4

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()

      process.stdout.write(`${OK}-${this.name}-ids: ${reason}\n`, () => {
        callback(); 
      })
    }
  }
}

export const xcmPallet = {
  Attempted: class Event {
    name = 'xcmPallet.Attempted'
    lookupName = 'XcmV2TraitsOutcome'
    lookupIndex = -1

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()
      let result = data.isComplete ? OK : FAIL

      process.stdout.write(`${result}-${this.name}-${reason}\n`, () => {
        callback(); 
      })
    }
  },
  Sent: class Event {
    name = 'xcmPallet.Sent'
    lookupName = 'XcmV2Xcm'
    lookupIndex = -1

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()

      process.stdout.write(`${OK}-${this.name}-${reason}\n`, () => {
        callback(); 
      })
    }
  },
}

export const polkadotXcm = {
  Attempted: class Event {
    name = 'polkadotXcm.Attempted'
    lookupName = 'XcmV2TraitsOutcome'
    lookupIndex = -1

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()
      let result = data.isComplete ? OK : FAIL

      process.stdout.write(`${result}-${this.name}-${reason}\n`, () => {
        callback(); 
      })
    }
  },
  Sent: class Event {
    name = 'polkadotXcm.Sent'
    lookupName = 'XcmV2Xcm'
    lookupIndex = -1

    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()

      process.stdout.write(`${OK}-${this.name}-${reason}\n`, () => {
        callback(); 
      })
    }
  },
}

export const dmpQueue = {
  ExecuteDownward: class Event {
    name = 'dmpQueue.ExecutedDownward'
    lookupName = 'XcmV2TraitsOutcome'
    lookupIndex = -1
    
    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()
      let result = data.isComplete ? OK : FAIL

      callback()
      return `${result}-${this.name}-${reason}`
    }
  }
}

export const ump = {
  ExecutedUpward: class Event {
    name = 'ump.ExecutedUpward'
    lookupName = 'XcmV2TraitsOutcome'
    lookupIndex = -1
    
    constructor(){}

    check(data, callback = ()=>{}) {
      let reason = data.toString()
      let result = data.isComplete ? OK : FAIL

      callback()
      return `${result}-${this.name}-${reason}`
    }
  }
}