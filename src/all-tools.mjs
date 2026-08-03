import { tool } from '@langchain/core/tools'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { z } from 'zod'



// 1. 读取文件工具
export const readFileTool = tool(
    async ({ filePath }) => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(`  [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
            return `文件内容:\n${content}`;
        } catch (error) {
            console.log(`  [工具调用] read_file("${filePath}") - 错误: ${error.message}`);
            return `读取文件失败: ${error.message}`;
        }
    },
    {
        name: 'read_file',
        description: '读取指定路径的文件内容',
        schema: z.object({
            filePath: z.string().describe('文件路径'),
        }),
    }
);



// 2. 写入文件工具
export const writeFileTool = tool(
    async ({ filePath, content }) => {
        try {
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(filePath, content, 'utf-8');
            console.log(`  [工具调用] write_file("${filePath}") - 成功写入 ${content.length} 字节`);
            return `文件写入成功: ${filePath}`;
        } catch (error) {
            console.log(`  [工具调用] write_file("${filePath}") - 错误: ${error.message}`);
            return `写入文件失败: ${error.message}`;
        }
    },
    {
        name: 'write_file',
        description: '向指定路径写入文件内容，自动创建目录',
        schema: z.object({
            filePath: z.string().describe('文件路径'),
            content: z.string().describe('要写入的文件内容'),
        }),
    }
);


// 3. 执行命令工具（带实时输出）
// echo 在 windows 可能不支持，可以设置 shell: 'powershell.exe'
export const executeCommandTool = tool(
    async ({ command, workingDirectory }) => {
        const cwd = workingDirectory || process.cwd();
        console.log(`  [工具调用] execute_command("${command}")${workingDirectory ? ` - 工作目录: ${workingDirectory}` : ''}`);

        return new Promise((resolve, reject) => {
            // 解析命令和参数
            const [cmd, ...args] = command.split(' ');

            const child = spawn(cmd, args, {
                cwd,
                stdio: 'inherit', // 实时输出到控制台
                shell: true,
            });

            let errorMsg = '';

            child.on('error', (error) => {
                errorMsg = error.message;
            });

            child.on('close', (code) => {
                if (code === 0) {
                    console.log(`  [工具调用] execute_command("${command}") - 执行成功`);
                    const cwdInfo = workingDirectory
                        ? `\n\n重要提示：命令在目录 "${workingDirectory}" 中执行成功。如果需要在这个项目目录中继续执行命令，请使用 workingDirectory: "${workingDirectory}" 参数，不要使用 cd 命令。`
                        : '';
                    resolve(`命令执行成功: ${command}${cwdInfo}`);
                } else {
                    console.log(`  [工具调用] execute_command("${command}") - 执行失败，退出码: ${code}`);
                    resolve(`命令执行失败，退出码: ${code}${errorMsg ? '\n错误: ' + errorMsg : ''}`);
                }
            });
        });
    },
    {
        name: 'execute_command',
        description: '执行系统命令，支持指定工作目录，实时显示输出',
        schema: z.object({
            command: z.string().describe('要执行的命令'),
            workingDirectory: z.string().optional().describe('工作目录（推荐指定）'),
        }),
    }
);
/**
在 Node.js 中使用子进程（如 child_process.exec 或 spawn）执行命令时，不推荐使用 cd 命令的主要原因如下：

1. 子进程的独立环境与状态丢失（最核心原因）
每次通过 Node.js 调用 Shell 命令时，通常都会启动一个新的子进程（Subprocess）。
如果你在一个命令中运行了 cd /path/to/dir，它只会在当前子进程的环境中切换工作目录。
当该命令执行完毕后，这个子进程就会销毁，其工作目录的修改无法影响 Node.js 主进程，也无法影响随后的其他子进程。
如果下一次调用命令时不显式传入 workingDirectory（或 cwd），下一个子进程依然会在初始的工作目录下运行，导致 cd 无效。

2. 跨平台兼容性问题
路径分隔符与 Shell 语法在不同系统下有所差异（例如 Windows 的 cmd.exe 在跨盘符切换时直接 cd D:\path 可能不会生效，需要使用 cd /d D:\path，而 Linux/macOS 则是 cd /path）。
直接传递统一的 workingDirectory 参数由 Node.js 底层 API 统一处理，可以保证良好的跨平台兼容性。

3. 安全与稳定性（防止命令注入与路径解析混乱）
手动拼接 cd <path> && <command> 容易引入字符串拼接漏洞或因路径中包含空格、特殊字符而导致的命令解析失败。
明确使用 Node.js 提供的 cwd / workingDirectory 配置选项，能够确保命令在指定的绝对路径下原子化执行，减少意外行为。
 */



// 4. 列出目录内容工具
export const listDirectoryTool = tool(
    async ({ directoryPath }) => {
        try {
            const files = await fs.readdir(directoryPath);
            console.log(`  [工具调用] list_directory("${directoryPath}") - 找到 ${files.length} 个项目`);
            return `目录内容:\n${files.map(f => `- ${f}`).join('\n')}`;
        } catch (error) {
            console.log(`  [工具调用] list_directory("${directoryPath}") - 错误: ${error.message}`);
            return `列出目录失败: ${error.message}`;
        }
    },
    {
        name: 'list_directory',
        description: '列出指定目录下的所有文件和文件夹',
        schema: z.object({
            directoryPath: z.string().describe('目录路径'),
        }),
    }
);





export const tools = [
    readFileTool,
    writeFileTool,
    executeCommandTool,
    listDirectoryTool,
]