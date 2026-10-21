# md-mermaid-pane — xem Markdown có sơ đồ Mermaid trong Claude Code

Mod cho Claude Code (chạy trên Claude Desktop): một panel hiện file Markdown, các khối ` ```mermaid ` được vẽ
thành sơ đồ, tự vẽ lại khi file thay đổi.

## Có gì

- Mục lục từ các tiêu đề, bấm để cuộn tới.
- Mỗi sơ đồ có −, +, Vừa khung, 100% và **Toàn màn hình** (mở trang riêng trong trình duyệt: lăn chuột để zoom,
  kéo để di chuyển, phím `+ - 0 1 f`).
- Sơ đồ sai cú pháp chỉ báo lỗi riêng nó, kèm code gốc; các sơ đồ khác vẫn hiện.
- Vẽ hoàn toàn trên máy: dùng `mermaid-cli` với trình duyệt Chrome / Chromium / Edge có sẵn, không gửi nội dung
  sơ đồ ra ngoài.

## Cần có

- Claude Code trên **Claude Desktop** (terminal không vẽ được SVG).
- **Node** và **npm**.
- **Chrome**, **Chromium** hoặc **Edge** đã cài.

## Cài

Trong một phiên Claude Code ở terminal:

```
/plugin install md-mermaid-pane --marketplace boykioyb/claude-code-markdown-mod
```

Trả lời `y` để thêm marketplace, rồi chọn phạm vi (user). Hoặc từ shell:

```bash
claude plugin install md-mermaid-pane --marketplace boykioyb/claude-code-markdown-mod
```

Trên Claude Desktop: bấm **+** cạnh ô nhập → **Plugins** → **Add marketplace** với `boykioyb/claude-code-markdown-mod`
→ **Add plugin**.

Rồi cài trình vẽ **một lần** trên mỗi máy (khoảng 450 MB, vào `~/.local/share/md-mermaid-pane`, không tải trình
duyệt kèm):

```
/md-view-setup
```

Dùng: `/md-view <đường dẫn file .md>`.

## Cập nhật

Xem phiên bản đang cài ở **+ → Plugins**, so với `version` trong
[`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) của repo.

**Claude Code ở terminal:**

```bash
claude plugin marketplace update claude-code-markdown-mod
```

```bash
claude plugin update md-mermaid-pane@claude-code-markdown-mod
```

Rồi khởi động lại phiên.

**Claude Desktop:** app giữ một bản clone của repo và **không tự kéo bản mới**; gỡ rồi cài lại vẫn chép từ bản clone cũ.
Cập nhật bản clone bằng git:

1. Thoát hẳn Claude Desktop (cả biểu tượng ở khay hệ thống / thanh menu), để app không giữ file.
2. Kéo bản clone lên `main` mới nhất và xem phiên bản.

   Windows (PowerShell):

   ```powershell
   $m = "$env:USERPROFILE/.claude/plugins/marketplaces/claude-code-markdown-mod"; git -C $m fetch origin; git -C $m reset --hard origin/main; Select-String '"version"' "$m/.claude-plugin/plugin.json"
   ```

   macOS / Linux:

   ```bash
   m=~/.claude/plugins/marketplaces/claude-code-markdown-mod; git -C $m fetch origin && git -C $m reset --hard origin/main && grep '"version"' $m/.claude-plugin/plugin.json
   ```

3. Xoá bản chép của phiên bản cũ trong `~/.claude/plugins/cache/claude-code-markdown-mod/md-mermaid-pane/` (Windows:
   `$env:USERPROFILE/.claude/plugins/cache/claude-code-markdown-mod/md-mermaid-pane/`), ví dụ thư mục `0.2.0`.
4. Mở lại app → **+ → Plugins** → cài hoặc bật **md-mermaid-pane**, kiểm phiên bản mới, rồi mở một phiên mới.

Đường dẫn trong lệnh dùng dấu `/` (PowerShell nhận được): copy từ một số khung chat, `\.` có thể mất dấu `\` và lệnh
báo không tìm thấy thư mục.

## Cấu hình khi cài

| Tuỳ chọn | Mặc định | Dùng khi |
|---|---|---|
| `nodePath` | `node` | `node` không nằm trên PATH của app (ví dụ cài qua nvm): điền đường dẫn đầy đủ |
| `npmPath` | `npm` | tương tự cho npm |
| `chromePath` | trống (tự dò) | trình duyệt cài ở chỗ khác chỗ mặc định |

Đặt lại bằng `claude plugin configure md-mermaid-pane@claude-code-markdown-mod`.
