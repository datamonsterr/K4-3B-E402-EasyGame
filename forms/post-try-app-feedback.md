# EasyGame Track B — Post-Try App User Feedback Form

Form khảo sát mới được tạo tự động qua **Google Forms MCP** nhằm thu thập phản hồi thực tế từ người dùng sau khi trải nghiệm ứng dụng EasyGame (Giao diện Thiết kế, Luồng tương tác, Mức độ giải quyết nỗi đau và Đóng góp ý kiến).

## 1. Thông Tin Form & Đường Dẫn

- **Tên Form:** EasyGame Track B - Post-Try App User Feedback
- **Form ID:** `1roByihtxXnuIudXCRwyvMgJzSIDlOLnJ3F-dP9Laj8I`
- **Đường dẫn điền Form (Public URL):**  
  [https://docs.google.com/forms/d/e/1FAIpQLSeK_bNLDDnMHTIjVszbfoicW4PkmhhuhZ3CPl98CvrNSfwIOw/viewform](https://docs.google.com/forms/d/e/1FAIpQLSeK_bNLDDnMHTIjVszbfoicW4PkmhhuhZ3CPl98CvrNSfwIOw/viewform)
- **Đường dẫn nhúng iframe (Embedded URI):**  
  [https://docs.google.com/forms/d/e/1FAIpQLSeK_bNLDDnMHTIjVszbfoicW4PkmhhuhZ3CPl98CvrNSfwIOw/viewform?embedded=true](https://docs.google.com/forms/d/e/1FAIpQLSeK_bNLDDnMHTIjVszbfoicW4PkmhhuhZ3CPl98CvrNSfwIOw/viewform?embedded=true)

---

## 2. Cấu Trúc Câu Hỏi Trong Form

| STT | Loại câu hỏi | Tiêu đề câu hỏi | Lựa chọn / Ghi chú | Bắt buộc |
|:---:|---|---|---|:---:|
| **1** | Multiple Choice | **Vai trò của bạn khi trải nghiệm ứng dụng EasyGame?** | • Học viên (Student / Learner)<br>• Lab Coach / Trợ giảng<br>• Giảng viên / Ban tổ chức (BTC)<br>• Khác | Có |
| **2** | Multiple Choice | **Đánh giá về Thiết kế giao diện (Design - Dark Cyan Minimal Theme, độ rõ nét, bố cục)?** | • 5/5 - Rất ấn tượng, hiện đại, chuẩn terminal developer<br>• 4/5 - Đẹp, chuyên nghiệp, dễ theo dõi<br>• 3/5 - Bình thường, tạm ổn<br>• 2/5 - Quá tối hoặc chưa quen mắt<br>• 1/5 - Không phù hợp | Có |
| **3** | Multiple Choice | **Đánh giá về Luồng tương tác (Flow - Chuyển tab, Tra cứu chat, Tickets Radar, Telemetry, Cmd+K)?** | • 5/5 - Rất mượt mà, trực quan, thao tác nhanh gọn<br>• 4/5 - Dễ dùng, luồng logic rõ ràng<br>• 3/5 - Cần làm quen một lúc<br>• 2/5 - Hơi nhiều thông tin, hơi rối<br>• 1/5 - Khó thao tác | Có |
| **4** | Multiple Choice | **Mức độ giải quyết nỗi đau (Pain points) của EasyGame (Bot trả lời chuẩn ≤3 câu, Radar SLA >2h/4h, Bản tin sạch 22h)?** | • Hoàn toàn giải quyết được (Triệt tiêu sai sót, kiểm soát chặt chẽ SLA và bản tin sạch)<br>• Giải quyết được phần lớn (>80% nhu cầu thực tế)<br>• Chỉ giải quyết được một phần (cần thêm tính năng)<br>• Chưa giải quyết được | Có |
| **5** | Paragraph / Text | **Góp ý khác hoặc điểm bạn muốn cải thiện thêm về thiết kế, tính năng, hoặc luồng tương tác?** | Nhập tự do (Text) | Không |
| **6** | Short Text | **Họ tên hoặc Discord Tag của bạn (Tùy chọn - Opt-in nhận cập nhật bản CP5):** | Nhập tự do (Text) | Không |

---

## 3. Tích Hợp Vào Ứng Dụng

Form đã được nhúng trực tiếp vào Tab **Feedback & QR** của mock chuẩn tại [`index.html`](../index.html). Bản dùng trong Next.js được tạo tại `codebase/public/mock/index.html` bằng `npm run sync:mock`:
- **Chế độ 1 - Nhúng tương tác:** Cho phép người dùng trực tiếp đánh giá và bấm gửi Form ngay trên giao diện mà không cần rời khỏi ứng dụng.
- **Chế độ 2 - Quét QR trên điện thoại:** Hiển thị mã QR Cyan kỹ thuật số (`screen5_qr.svg`) và nút sao chép link một chạm.
