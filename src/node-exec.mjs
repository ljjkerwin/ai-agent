import { spawn } from 'node:child_process'


const command = 'echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts'
const cwd = process.cwd()


const [cmd, ...args] = command.split(' ')


const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: true // 会有不安全提示
})

let errorMsg = ''

child.on('error', error => {
    errorMsg = error.message
})

child.on('close', code => {
    if (code === 0) {
        process.exit(0)
    } else {
        if (errorMsg) {
            console.log(`错误: ${errorMsg}`)
        }
        process.exit(code || 1)
    }
})