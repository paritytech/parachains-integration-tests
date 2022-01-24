export const signAndSendCallback = (eventEvals) => 
  ({ events = [], status }) => {
    eventEvals.forEach(({ eventEval, callback }) => {
      let evaluator = new eventEval()
      const { name, lookupName, lookupIndex } = evaluator
      
      if (status.isInBlock) {
        events.forEach((record: any) => {
          const { event: { data, method, section, typeDef }} = record
          if (name === `${section}.${method}`) {
            data.forEach((data, index) => {
              if (lookupName === typeDef[index].lookupName || lookupIndex === typeDef[index].lookupIndex ) {
                evaluator.check(data, () => callback())
              }
            })
          }
        });
      }
    })  
  } 