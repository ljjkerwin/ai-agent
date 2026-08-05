import { RunnableBranch, RunnableLambda } from "@langchain/core/runnables";


const isPositive = RunnableLambda.from(input => input > 0)
const isNegative = RunnableLambda.from(input => input < 0)
const isEven = RunnableLambda.from(input => input % 2 === 0)


const handlePositive = RunnableLambda.from(input => `${input}是正数`)
const handleNegative = RunnableLambda.from(input => `${input}是负数`)
const handleEven = RunnableLambda.from(input => `${input}是偶数`)
const handleDefault = RunnableLambda.from(input => `默认 ${input}`)


// 相当于if else
const branch = RunnableBranch.from([
    [isPositive, handlePositive],
    [isNegative, handleNegative],
    [isEven, handleEven],
    handleDefault
])


console.log(await branch.invoke(1))
console.log(await branch.invoke(-1))
console.log(await branch.invoke(2))
console.log(await branch.invoke('haha'))

