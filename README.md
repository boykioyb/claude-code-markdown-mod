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

## Cấu hình khi cài

| Tuỳ chọn | Mặc định | Dùng khi |
|---|---|---|
| `nodePath` | `node` | `node` không nằm trên PATH của app (ví dụ cài qua nvm): điền đường dẫn đầy đủ |
| `npmPath` | `npm` | tương tự cho npm |
| `chromePath` | trống (tự dò) | trình duyệt cài ở chỗ khác chỗ mặc định |

Đặt lại bằng `claude plugin configure md-mermaid-pane@claude-code-markdown-mod`.
