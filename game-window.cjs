// Where the GTA window is on screen, so the fingerprint helper also works in windowed mode.
// Asks Windows for the window rectangle of the game (FindWindow + GetClientRect + ClientToScreen),
// the same information any window manager or OBS uses. It never opens the game process, reads its
// memory or sends it anything. A small PowerShell loop prints the rectangle once a second.
const { spawn } = require('node:child_process');

const SCRIPT = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class GtaWin {
  public struct R { public int L, T, Rt, B; }
  public struct P { public int X, Y; }
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern IntPtr FindWindow(string cls, string title);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out R r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref P p);
  public static IntPtr Find() {
    IntPtr h = FindWindow("grcWindow", null);
    if (h != IntPtr.Zero) return h;
    IntPtr found = IntPtr.Zero;
    EnumWindows((w, l) => {
      if (!IsWindowVisible(w)) return true;
      var s = new StringBuilder(256);
      GetWindowText(w, s, 256);
      if (s.ToString().StartsWith("Grand Theft Auto V")) { found = w; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
  public static string Rect() {
    IntPtr h = Find();
    if (h == IntPtr.Zero || IsIconic(h)) return "none";
    R r; GetClientRect(h, out r);
    P p = new P(); ClientToScreen(h, ref p);
    return p.X + " " + p.Y + " " + r.Rt + " " + r.B;
  }
}
"@
[GtaWin]::SetProcessDPIAware() | Out-Null
while ($true) { [Console]::Out.WriteLine([GtaWin]::Rect()); [Console]::Out.Flush(); Start-Sleep -Milliseconds 1000 }
`;

// Parses one line of the loop: physical-pixel client rectangle, or null.
function parseRect(line) {
  const n = String(line).trim().split(' ').map(Number);
  if (n.length !== 4 || n.some(v => !Number.isInteger(v)) || n[2] < 200 || n[3] < 150) return null;
  return { x: n[0], y: n[1], width: n[2], height: n[3] };
}

function createGameWindow() {
  let child = null;
  let rect = null;
  let buffer = '';

  function start() {
    if (child || process.platform !== 'win32') return;
    const encoded = Buffer.from(SCRIPT, 'utf16le').toString('base64');
    child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    child.stdout.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      if (lines.length) rect = parseRect(lines[lines.length - 1]);
    });
    child.on('exit', () => { child = null; rect = null; });
  }

  function stop() {
    if (child) child.kill();
    child = null;
    rect = null;
  }

  // Client area of the game window in physical screen pixels, or null (not found, minimized, not Windows).
  return { start, stop, rect: () => rect };
}

module.exports = { createGameWindow, parseRect };
