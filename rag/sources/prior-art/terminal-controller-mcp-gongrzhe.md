---
title: "terminal-controller-mcp (GongRzhe) implementation"
source_url: "https://raw.githubusercontent.com/GongRzhe/terminal-controller-mcp/main/terminal_controller.py"
source_type: github_readme
fetched: 2026-06-01
topic: prior-art
tags: ["mcp", "one-shot", "timeout", "blacklist", "dangerous-commands", "command-history", "cross-platform", "safety"]
summary: "タイムアウト付き単発コマンド実行+ディレクトリ操作+行単位ファイル編集のMCPサーバ実装本体(Python)。"
relevance: "我々の現状(非対話の単発実行)とほぼ同じ出発点。30秒timeout・危険コマンドのブラックリスト(rm -rf /等)・command_historyという素朴な安全/完了設計を一次ソースで確認でき、対話PTY化で何が増えるかの差分基準になる。"
chars: 22657
---

import asyncio
import os
import subprocess
import platform
import sys
from typing import List, Dict, Optional
from datetime import datetime
from mcp.server.fastmcp import FastMCP
# Initialize MCP server
mcp = FastMCP("terminal-controller", log\_level="INFO")
# List to store command history
command\_history = []
# Maximum history size
MAX\_HISTORY\_SIZE = 50
async def run\_command(cmd: str, timeout: int = 30) -> Dict:
"""
Execute command and return results
Args:
cmd: Command to execute
timeout: Command timeout in seconds
Returns:
Dictionary containing command execution results
"""
start\_time = datetime.now()
try:
# Create command appropriate for current OS
if platform.system() == "Windows":
process = await asyncio.create\_subprocess\_shell(
cmd,
stdout=asyncio.subprocess.PIPE,
stderr=asyncio.subprocess.PIPE,
shell=True
)
else:
process = await asyncio.create\_subprocess\_shell(
cmd,
stdout=asyncio.subprocess.PIPE,
stderr=asyncio.subprocess.PIPE,
shell=True,
executable="/bin/bash"
)
try:
stdout, stderr = await asyncio.wait\_for(process.communicate(), timeout)
stdout = stdout.decode('utf-8', errors='replace')
stderr = stderr.decode('utf-8', errors='replace')
return\_code = process.returncode
except asyncio.TimeoutError:
try:
process.kill()
except:
pass
return {
"success": False,
"stdout": "",
"stderr": f"Command timed out after {timeout} seconds",
"return\_code": -1,
"duration": str(datetime.now() - start\_time),
"command": cmd
}
duration = datetime.now() - start\_time
result = {
"success": return\_code == 0,
"stdout": stdout,
"stderr": stderr,
"return\_code": return\_code,
"duration": str(duration),
"command": cmd
}
# Add to history
command\_history.append({
"timestamp": datetime.now().isoformat(),
"command": cmd,
"success": return\_code == 0
})
# If history is too long, remove oldest record
if len(command\_history) > MAX\_HISTORY\_SIZE:
command\_history.pop(0)
return result
except Exception as e:
return {
"success": False,
"stdout": "",
"stderr": f"Error executing command: {str(e)}",
"return\_code": -1,
"duration": str(datetime.now() - start\_time),
"command": cmd
}
@mcp.tool()
async def execute\_command(command: str, timeout: int = 30) -> str:
"""
Execute terminal command and return results
Args:
command: Command line command to execute
timeout: Command timeout in seconds, default is 30 seconds
Returns:
Output of the command execution
"""
# Check for dangerous commands (can add more security checks)
dangerous\_commands = ["rm -rf /", "mkfs"]
if any(dc in command.lower() for dc in dangerous\_commands):
return "For security reasons, this command is not allowed."
result = await run\_command(command, timeout)
if result["success"]:
output = f"Command executed successfully (duration: {result['duration']})\n\n"
if result["stdout"]:
output += f"Output:\n{result['stdout']}\n"
else:
output += "Command had no output.\n"
if result["stderr"]:
output += f"\nWarnings/Info:\n{result['stderr']}"
return output
else:
output = f"Command execution failed (duration: {result['duration']})\n"
if result["stdout"]:
output += f"\nOutput:\n{result['stdout']}\n"
if result["stderr"]:
output += f"\nError:\n{result['stderr']}"
output += f"\nReturn code: {result['return\_code']}"
return output
@mcp.tool()
async def get\_command\_history(count: int = 10) -> str:
"""
Get recent command execution history
Args:
count: Number of recent commands to return
Returns:
Formatted command history record
"""
if not command\_history:
return "No command execution history."
count = min(count, len(command\_history))
recent\_commands = command\_history[-count:]
output = f"Recent {count} command history:\n\n"
for i, cmd in enumerate(recent\_commands):
status = "✓" if cmd["success"] else "✗"
output += f"{i+1}. [{status}] {cmd['timestamp']}: {cmd['command']}\n"
return output
@mcp.tool()
async def get\_current\_directory() -> str:
"""
Get current working directory
Returns:
Path of current working directory
"""
return os.getcwd()
@mcp.tool()
async def change\_directory(path: str) -> str:
"""
Change current working directory
Args:
path: Directory path to switch to
Returns:
Operation result information
"""
try:
os.chdir(path)
return f"Switched to directory: {os.getcwd()}"
except FileNotFoundError:
return f"Error: Directory '{path}' does not exist"
except PermissionError:
return f"Error: No permission to access directory '{path}'"
except Exception as e:
return f"Error changing directory: {str(e)}"
@mcp.tool()
async def list\_directory(path: Optional[str] = None) -> str:
"""
List files and subdirectories in the specified directory
Args:
path: Directory path to list contents, default is current directory
Returns:
List of directory contents
"""
if path is None:
path = os.getcwd()
try:
items = os.listdir(path)
dirs = []
files = []
for item in items:
full\_path = os.path.join(path, item)
if os.path.isdir(full\_path):
dirs.append(f"📁 {item}/")
else:
files.append(f"📄 {item}")
# Sort directories and files
dirs.sort()
files.sort()
if not dirs and not files:
return f"Directory '{path}' is empty"
output = f"Contents of directory '{path}':\n\n"
if dirs:
output += "Directories:\n"
output += "\n".join(dirs) + "\n\n"
if files:
output += "Files:\n"
output += "\n".join(files)
return output
except FileNotFoundError:
return f"Error: Directory '{path}' does not exist"
except PermissionError:
return f"Error: No permission to access directory '{path}'"
except Exception as e:
return f"Error listing directory contents: {str(e)}"
@mcp.tool()
async def write\_file(path: str, content: str, mode: str = "overwrite") -> str:
"""
Write content to a file
Args:
path: Path to the file
content: Content to write (string or JSON object)
mode: Write mode ('overwrite' or 'append')
Returns:
Operation result information
"""
try:
# Handle different content types
if not isinstance(content, str):
try:
import json
# Advanced JSON serialization with better handling of complex objects
content = json.dumps(content,
indent=4,
sort\_keys=False,
ensure\_ascii=False,
default=lambda obj: str(obj) if hasattr(obj, '\_\_dict\_\_') else repr(obj))
except Exception as e:
# Try a more aggressive approach if standard serialization fails
try:
# Convert object to dictionary first if it has \_\_dict\_\_
if hasattr(content, '\_\_dict\_\_'):
import json
content = json.dumps(content.\_\_dict\_\_,
indent=4,
sort\_keys=False,
ensure\_ascii=False)
else:
# Last resort: convert to string representation
content = str(content)
except Exception as inner\_e:
return f"Error: Unable to convert complex object to writable string: {str(e)}, then tried alternative method and got: {str(inner\_e)}"
# Choose file mode based on the specified writing mode
file\_mode = "w" if mode.lower() == "overwrite" else "a"
# Ensure content ends with a newline if it doesn't already
if content and not content.endswith('\n'):
content += '\n'
# Ensure directory exists
directory = os.path.dirname(os.path.abspath(path))
if directory and not os.path.exists(directory):
os.makedirs(directory, exist\_ok=True)
with open(path, file\_mode, encoding="utf-8") as file:
file.write(content)
# Verify the write operation was successful
if os.path.exists(path):
file\_size = os.path.getsize(path)
return f"Successfully wrote {file\_size} bytes to '{path}' in {mode} mode."
else:
return f"Write operation completed, but unable to verify file exists at '{path}'."
except FileNotFoundError:
return f"Error: The directory in path '{path}' does not exist and could not be created."
except PermissionError:
return f"Error: No permission to write to file '{path}'."
except Exception as e:
return f"Error writing to file: {str(e)}"
@mcp.tool()
async def read\_file(path: str, start\_row: int = None, end\_row: int = None, as\_json: bool = False) -> str:
"""
Read content from a file with optional row selection
Args:
path: Path to the file
start\_row: Starting row to read from (0-based, optional)
end\_row: Ending row to read to (0-based, inclusive, optional)
as\_json: If True, attempt to parse file content as JSON (optional)
Returns:
File content or selected lines, optionally parsed as JSON
"""
try:
if not os.path.exists(path):
return f"Error: File '{path}' does not exist."
if not os.path.isfile(path):
return f"Error: '{path}' is not a file."
# Check file size before reading to prevent memory issues
file\_size = os.path.getsize(path)
if file\_size > 10 \* 1024 \* 1024: # 10 MB limit
return f"Warning: File is very large ({file\_size/1024/1024:.2f} MB). Consider using row selection."
with open(path, 'r', encoding='utf-8', errors='replace') as file:
lines = file.readlines()
# If row selection is specified
if start\_row is not None:
if start\_row < 0:
return "Error: start\_row must be non-negative."
# If only start\_row is specified, read just that single row
if end\_row is None:
if start\_row >= len(lines):
return f"Error: start\_row {start\_row} is out of range (file has {len(lines)} lines)."
content = f"Line {start\_row}: {lines[start\_row]}"
else:
# Both start\_row and end\_row are specified
if end\_row < start\_row:
return "Error: end\_row must be greater than or equal to start\_row."
if end\_row >= len(lines):
end\_row = len(lines) - 1
selected\_lines = lines[start\_row:end\_row+1]
content = ""
for i, line in enumerate(selected\_lines):
content += f"Line {start\_row + i}: {line}" if not line.endswith('\n') else f"Line {start\_row + i}: {line}"
else:
# If no row selection, return the entire file
content = "".join(lines)
# If as\_json is True, try to parse the content as JSON
if as\_json:
try:
import json
# If we're showing line numbers, we cannot parse as JSON
if start\_row is not None:
return "Error: Cannot parse as JSON when displaying line numbers. Use as\_json without row selection."
# Try to parse the content as JSON
parsed\_json = json.loads(content)
# Return pretty-printed JSON for better readability
return json.dumps(parsed\_json, indent=4, sort\_keys=False, ensure\_ascii=False)
except json.JSONDecodeError as e:
return f"Error: File content is not valid JSON. {str(e)}\n\nRaw content:\n{content}"
return content
except PermissionError:
return f"Error: No permission to read file '{path}'."
except Exception as e:
return f"Error reading file: {str(e)}"
@mcp.tool()
async def insert\_file\_content(path: str, content: str, row: int = None, rows: list = None) -> str:
"""
Insert content at specific row(s) in a file
Args:
path: Path to the file
content: Content to insert (string or JSON object)
row: Row number to insert at (0-based, optional)
rows: List of row numbers to insert at (0-based, optional)
Returns:
Operation result information
"""
try:
# Handle different content types
if not isinstance(content, str):
try:
import json
content = json.dumps(content, indent=4, sort\_keys=False, ensure\_ascii=False, default=str)
except Exception as e:
return f"Error: Unable to convert content to JSON string: {str(e)}"
# Ensure content ends with a newline if it doesn't already
if content and not content.endswith('\n'):
content += '\n'
# Create file if it doesn't exist
directory = os.path.dirname(os.path.abspath(path))
if not os.path.exists(directory):
os.makedirs(directory, exist\_ok=True)
if not os.path.exists(path):
with open(path, 'w', encoding='utf-8') as file:
pass
with open(path, 'r', encoding='utf-8', errors='replace') as file:
lines = file.readlines()
# Ensure all existing lines end with newlines
for i in range(len(lines)):
if lines[i] and not lines[i].endswith('\n'):
lines[i] += '\n'
# Prepare lines for insertion
content\_lines = content.splitlines(True) # Keep line endings
# Handle inserting at specific rows
if rows is not None:
if not isinstance(rows, list):
return "Error: 'rows' parameter must be a list of integers."
# Sort rows in descending order to avoid changing indices during insertion
rows = sorted(rows, reverse=True)
for r in rows:
if not isinstance(r, int) or r < 0:
return "Error: Row numbers must be non-negative integers."
if r > len(lines):
# If row is beyond the file, append necessary empty lines
lines.extend(['\n'] \* (r - len(lines)))
lines.extend(content\_lines)
else:
# Insert content at each specified row
for line in reversed(content\_lines):
lines.insert(r, line)
# Write back to the file
with open(path, 'w', encoding='utf-8') as file:
file.writelines(lines)
return f"Successfully inserted content at rows {rows} in '{path}'."
# Handle inserting at a single row
elif row is not None:
if not isinstance(row, int) or row < 0:
return "Error: Row number must be a non-negative integer."
if row > len(lines):
# If row is beyond the file, append necessary empty lines
lines.extend(['\n'] \* (row - len(lines)))
lines.extend(content\_lines)
else:
# Insert content at the specified row
for line in reversed(content\_lines):
lines.insert(row, line)
# Write back to the file
with open(path, 'w', encoding='utf-8') as file:
file.writelines(lines)
return f"Successfully inserted content at row {row} in '{path}'."
# If neither row nor rows specified, append to the end
else:
with open(path, 'a', encoding='utf-8') as file:
file.write(content)
return f"Successfully appended content to '{path}'."
except PermissionError:
return f"Error: No permission to modify file '{path}'."
except Exception as e:
return f"Error inserting content: {str(e)}"
@mcp.tool()
async def delete\_file\_content(path: str, row: int = None, rows: list = None, substring: str = None) -> str:
"""
Delete content at specific row(s) from a file
Args:
path: Path to the file
row: Row number to delete (0-based, optional)
rows: List of row numbers to delete (0-based, optional)
substring: If provided, only delete this substring within the specified row(s), not the entire row (optional)
Returns:
Operation result information
"""
try:
if not os.path.exists(path):
return f"Error: File '{path}' does not exist."
if not os.path.isfile(path):
return f"Error: '{path}' is not a file."
with open(path, 'r', encoding='utf-8', errors='replace') as file:
lines = file.readlines()
total\_lines = len(lines)
deleted\_rows = []
modified\_rows = []
# Handle substring deletion (doesn't delete entire rows)
if substring is not None:
# For multiple rows
if rows is not None:
if not isinstance(rows, list):
return "Error: 'rows' parameter must be a list of integers."
for r in rows:
if not isinstance(r, int) or r < 0:
return "Error: Row numbers must be non-negative integers."
if r < total\_lines and substring in lines[r]:
original\_line = lines[r]
lines[r] = lines[r].replace(substring, '')
# Ensure line ends with newline if original did
if original\_line.endswith('\n') and not lines[r].endswith('\n'):
lines[r] += '\n'
modified\_rows.append(r)
# For single row
elif row is not None:
if not isinstance(row, int) or row < 0:
return "Error: Row number must be a non-negative integer."
if row >= total\_lines:
return f"Error: Row {row} is out of range (file has {total\_lines} lines)."
if substring in lines[row]:
original\_line = lines[row]
lines[row] = lines[row].replace(substring, '')
# Ensure line ends with newline if original did
if original\_line.endswith('\n') and not lines[row].endswith('\n'):
lines[row] += '\n'
modified\_rows.append(row)
# For entire file
else:
for i in range(len(lines)):
if substring in lines[i]:
original\_line = lines[i]
lines[i] = lines[i].replace(substring, '')
# Ensure line ends with newline if original did
if original\_line.endswith('\n') and not lines[i].endswith('\n'):
lines[i] += '\n'
modified\_rows.append(i)
# Write back to the file
with open(path, 'w', encoding='utf-8') as file:
file.writelines(lines)
if not modified\_rows:
return f"No occurrences of '{substring}' found in the specified rows."
return f"Successfully removed '{substring}' from {len(modified\_rows)} rows ({modified\_rows}) in '{path}'."
# Handle deleting multiple rows
elif rows is not None:
if not isinstance(rows, list):
return "Error: 'rows' parameter must be a list of integers."
# Sort rows in descending order to avoid changing indices during deletion
rows = sorted(rows, reverse=True)
for r in rows:
if not isinstance(r, int) or r < 0:
return "Error: Row numbers must be non-negative integers."
if r < total\_lines:
lines.pop(r)
deleted\_rows.append(r)
# Write back to the file
with open(path, 'w', encoding='utf-8') as file:
file.writelines(lines)
if not deleted\_rows:
return f"No rows were within range to delete (file has {total\_lines} lines)."
return f"Successfully deleted {len(deleted\_rows)} rows ({deleted\_rows}) from '{path}'."
# Handle deleting a single row
elif row is not None:
if not isinstance(row, int) or row < 0:
return "Error: Row number must be a non-negative integer."
if row >= total\_lines:
return f"Error: Row {row} is out of range (file has {total\_lines} lines)."
# Delete the specified row
lines.pop(row)
# Write back to the file
with open(path, 'w', encoding='utf-8') as file:
file.writelines(lines)
return f"Successfully deleted row {row} from '{path}'."
# If neither row nor rows specified, clear the file
else:
with open(path, 'w', encoding='utf-8') as file:
pass
return f"Successfully cleared all content from '{path}'."
except PermissionError:
return f"Error: No permission to modify file '{path}'."
except Exception as e:
return f"Error deleting content: {str(e)}"
@mcp.tool()
async def update\_file\_content(path: str, content: str, row: int = None, rows: list = None, substring: str = None) -> str:
"""
Update content at specific row(s) in a file
Args:
path: Path to the file
content: New content to place at the specified row(s)
row: Row number to update (0-based, optional)
rows: List of row numbers to update (0-based, optional)
substring: If provided, only replace this substring within the specified row(s), not the entire row
Returns:
Operation result information
"""
try:
# Handle different content types
if not isinstance(content, str):
try:
import json
content = json.dumps(content, indent=4, sort\_keys=False, ensure\_ascii=False, default=str)
except Exception as e:
return f"Error: Unable to convert content to JSON string: {str(e)}"
if not os.path.exists(path):
return f"Error: File '{path}' does not exist."
if not os.path.isfile(path):
return f"Error: '{path}' is not a file."
with open(path, 'r', encoding='utf-8', errors='replace') as file:
lines = file.readlines()
total\_lines = len(lines)
updated\_rows = []
# Ensure content ends with a newline if replacing a full line and doesn't already have one
if substring is None and content and not content.endswith('\n'):
content += '\n'
# Prepare lines for update
content\_lines = content.splitlines(True) if substring is None else [content]
# Handle updating multiple rows
if rows is not None:
if not isinstance(rows, list):
return "Error: 'rows' parameter must be a list of integers."
for r in rows:
if not isinstance(r, int) or r < 0:
return "Error: Row numbers must be non-negative integers."
if r < total\_lines:
# If substring is provided, only replace that part
if substring is not None:
# Only update if substring exists in the line
if substring in lines[r]:
original\_line = lines[r]
lines[r] = lines[r].replace(substring, content)
# Ensure line ends with newline if original did
if original\_line.endswith('\n') and not lines[r].endswith('\n'):
lines[r] += '\n'
updated\_rows.append(r)
else:
# Otherwise, replace the entire line
# If we have multiple content lines, use them in sequence
if len(content\_lines) > 1:
content\_index = r % len(content\_lines)
lines[r] = content\_lines[content\_index]
else:
# If we have only one content line, use it for all rows
lines[r] = content\_lines[0] if content\_lines else "\n"
updated\_rows.append(r)
# Write back to the file
with open(path, 'w', encoding='utf-8') as file:
file.writelines(lines)
if not updated\_rows:
if substring is not None:
return f"No occurrences of substring '{substring}' found in the specified rows (file has {total\_lines} lines)."
else:
return f"No rows were within range to update (file has {total\_lines} lines)."
if substring is not None:
return f"Successfully updated substring in {len(updated\_rows)} rows ({updated\_rows}) in '{path}'."
else:
return f"Successfully updated {len(updated\_rows)} rows ({updated\_rows}) in '{path}'."
# Handle updating a single row
elif row is not None:
if not isinstance(row, int) or row < 0:
return "Error: Row number must be a non-negative integer."
if row >= total\_lines:
return f"Error: Row {row} is out of range (file has {total\_lines} lines)."
# If substring is provided, only replace that part
if substring is not None:
# Only update if substring exists in the line
if substring in lines[row]:
original\_line = lines[row]
lines[row] = lines[row].replace(substring, content)
# Ensure line ends with newline if original did
if original\_line.endswith('\n') and not lines[row].endswith('\n'):
lines[row] += '\n'
else:
return f"Substring '{substring}' not found in row {row}."
else:
# Otherwise, replace the entire line
lines[row] = content\_lines[0] if content\_lines else "\n"
# Write back to the file
with open(path, 'w', encoding='utf-8') as file:
file.writelines(lines)
if substring is not None:
return f"Successfully updated substring in row {row} in '{path}'."
else:
return f"Successfully updated row {row} in '{path}'."
# If neither row nor rows specified, update the entire file
else:
if substring is not None:
# Replace substring throughout the file
updated\_count = 0
for i in range(len(lines)):
if substring in lines[i]:
original\_line = lines[i]
lines[i] = lines[i].replace(substring, content)
# Ensure line ends with newline if original did
if original\_line.endswith('\n') and not lines[i].endswith('\n'):
lines[i] += '\n'
updated\_count += 1
with open(path, 'w', encoding='utf-8') as file:
file.writelines(lines)
if updated\_count == 0:
return f"Substring '{substring}' not found in any line of '{path}'."
return f"Successfully updated substring in {updated\_count} lines in '{path}'."
else:
# Replace entire file content
with open(path, 'w', encoding='utf-8') as file:
file.write(content)
return f"Successfully updated all content in '{path}'."
except PermissionError:
return f"Error: No permission to modify file '{path}'."
except Exception as e:
return f"Error updating content: {str(e)}"
def main():
"""
Entry point function that runs the MCP server.
"""
print("Starting Terminal Controller MCP Server...", file=sys.stderr)
mcp.run(transport='stdio')
# Make the module callable
def \_\_call\_\_():
"""
Make the module callable for uvx.
This function is called when the module is executed directly.
"""
print("Terminal Controller MCP Server starting via \_\_call\_\_...", file=sys.stderr)
mcp.run(transport='stdio')
# Add this for compatibility with uvx
sys.modules[\_\_name\_\_].\_\_call\_\_ = \_\_call\_\_
# Run the server when the script is executed directly
if \_\_name\_\_ == "\_\_main\_\_":
main()
