const myBefore = async (context, tab, ...args) => {
  console.log(`${tab}Custom before ${args}`)
}

export default myBefore