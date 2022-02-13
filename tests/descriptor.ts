import { Describe } from "./interfaces/test"
import { beforeBuilder, beforeEachBuilder, afterBuilder, afterEachBuilder  } from "./hooks"
import { itsBuilder } from "./it"

export const describersBuilder = (description: Describe) => {
  describe(`📚 ${description.name}`, async () => {
    before(function () {
      for (let i = 0; i < 4; i++){
        console.group()

      }
    })

    after(function () {
      for (let i = 0; i < 4; i++){
        console.groupEnd()
      }
    })
    let indent = 0

    let builders = [
      { attribute: description.before, func: beforeBuilder },
      { attribute: description.beforeEach, func: beforeEachBuilder },
      { attribute: description.after, func: afterBuilder },
      { attribute: description.afterEach, func: afterEachBuilder },
    ]

    for (const builder of builders) {
      if (builder.attribute && builder.attribute.length > 0)
        for (const attr of builder.attribute) {
          builder.func(attr, indent)
        }
    }

    if (description.its && description.its.length > 0) {
      for (const it of description.its) {
        itsBuilder(it, indent)
      }
    }

    if (description.describes && description.describes.length > 0) {
      for (const desc of description.describes) {
        describersBuilder(desc)
      }
    }
  })
}