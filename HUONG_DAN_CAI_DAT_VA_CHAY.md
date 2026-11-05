# 📖 HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN DELIFOOD

Tài liệu này hướng dẫn chi tiết từng bước để cài đặt, thiết lập môi trường và khởi chạy toàn bộ hệ thống **DeliFood** (Monorepo gồm Backend NestJS và Frontend Mobile React Native / Expo).

---

## 📋 Mục lục
1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt công cụ ban đầu](#2-cài-đặt-công-cụ-ban-đầu)
3. [Cài đặt thư viện dependencies](#3-cài-đặt-thư-viện-dependencies)
4. [Build package Types dùng chung (BẮT BUỘC)](#4-build-package-types-dùng-chung-bắt-buộc)
5. [Cấu hình biến môi trường (.env)](#5-cấu-hình-biến-môi-trường-env)
6. [Đồng bộ Database (Drizzle ORM)](#6-đồng-bộ-database-drizzle-orm)
7. [Khởi chạy dự án](#7-khởi-chạy-dự-án)
8. [Hướng dẫn chạy trên thiết bị / Máy ảo](#8-hướng-dẫn-chạy-trên-thiết-bị--máy-ảo)
9. [Các lỗi thường gặp và cách khắc phục](#9-các-lỗi-thường-gặp-và-cách-khắc-phục)

---

## 1. Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo máy tính đã cài đặt:
- **Node.js**: Phiên bản LTS (`v20.x` hoặc `v22.x`). Kiểm tra bằng lệnh: `node -v`
- **Git**: Kiểm tra bằng lệnh: `git -v`
- **pnpm**: Dự án sử dụng phiên bản `pnpm@12.x` hoặc `pnpm@9.x+`.
- **Trình duyệt Web** (Chrome / Edge).
- **Ứng dụng Expo Go** (tải trên Google Play / App Store) nếu chạy thử trên điện thoại thật, HOẶC **Android Studio** nếu chạy máy ảo Android.

---

## 2. Cài đặt công cụ ban đầu

Nếu máy tính chưa có **pnpm**, mở Terminal / PowerShell và chạy:
```bash
npm install -g pnpm@12.9.1
```
Kiểm tra lại:
```bash
pnpm -v
```

---

## 3. Cài đặt thư viện dependencies

Tại thư mục gốc dự án (`D:\DeliveryFood`), chạy lệnh:
```bash
pnpm install
```
> [!NOTE]
> Dự án sử dụng mô hình `pnpm-workspace`. Lệnh trên sẽ tự động liên kết và cài đặt thư viện cho cả thư mục gốc, thư mục `apps/api`, `apps/mobile` và `packages/types`. Tuyệt đối không xóa hay copy thủ công `node_modules`.

---

## 4. Build package Types dùng chung (BẮT BUỘC)

Package `@food-delivery/types` chứa các định nghĩa Enum (`UserRole`, `OrderStatus`), kiểu dữ liệu API dùng chung giữa Mobile và Backend. Bạn **phải build package này trước** khi chạy code:

```bash
pnpm build:types
```
*(Nếu bỏ qua bước này, hệ thống sẽ báo lỗi: `Unable to resolve @food-delivery/types`)*

---

## 5. Cấu hình biến môi trường (.env)

Dự án cần 2 file môi trường nằm riêng biệt:

### 5.1. Backend API (`apps/api/.env`)
Tạo file `apps/api/.env` (nếu chưa có) với nội dung mẫu:

```dotenv
PORT=3000

# 1. Cơ sở dữ liệu PostgreSQL (Neon Cloud)
DATABASE_URL=postgresql://neondb_owner:npg_xxxxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# 2. Bảo mật JWT
JWT_SECRET=super_secret_jwt_key_delifood_2026

# 3. Redis In-Memory (Upstash Redis cho Cache, GPS và Monitor)
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=Axxxx==

# 4. Cổng thanh toán Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxx

# 5. AI Google Gemini
GEMINI_API_KEY=AIzaSyxxxxxx
GEMINI_MODEL=gemini-3.5-flash-lite

# 6. Upload ảnh (UploadThing)
UPLOADTHING_TOKEN=eyJxxxxxx

# 7. Google OAuth / Firebase
FIREBASE_PROJECT_ID=deliveryfood-4139c
GOOGLE_WEB_CLIENT_ID=xxxxxx.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_SECRET=GOCSPX-xxxxxx
API_PUBLIC_URL=http://localhost:3000
```

### 5.2. Mobile App (`apps/mobile/.env`)
Tạo file `apps/mobile/.env` với nội dung:

```dotenv
# Địa chỉ API Backend:
# Nếu test trên máy tính / web:
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SERVER_URL=http://localhost:3000

# Nếu test trên MÁY ẢO ANDROID EMULATOR (dùng 10.0.2.2 thay cho localhost):
# EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
# EXPO_PUBLIC_SERVER_URL=http://10.0.2.2:3000

# Hoặc dùng Server Render đã deploy online:
# EXPO_PUBLIC_API_URL=https://deliveryfood-l3dv.onrender.com/api
# EXPO_PUBLIC_SERVER_URL=https://deliveryfood-l3dv.onrender.com

# Stripe Mobile Key (Publishable key)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51UTa4K3gspJgfCbUxqvY8tF6vMmjC1kDYpgp4DExzNSGng3Dy81xRDWH8Mbc4LgsinkMImGsA2BTY1awH7d475bV00u7KqOd7B

# Firebase Client
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyB_b6DEscY8Fikyro5dDmw0b1n1mjpL0S4
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=deliveryfood-4139c.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=deliveryfood-4139c
EXPO_PUBLIC_FIREBASE_APP_ID=1:73978995998:web:36d7202974accc6429150f
```

---

## 6. Đồng bộ Database (Drizzle ORM)

Nếu có thay đổi bảng trong `apps/api/src/db/schema` hoặc khởi tạo database mới:
```bash
# Đẩy schema lên database Neon
pnpm --filter api run db:push

# (Tùy chọn) Mở giao diện trực quan xem dữ liệu DB trên web:
pnpm --filter api run db:studio
```

---

## 7. Khởi chạy dự án

Bạn nên mở **2 cửa sổ Terminal** riêng biệt để dễ theo dõi log:

### 🖥️ Terminal 1: Chạy Backend NestJS API
```bash
pnpm dev:api
```
- Khi chạy thành công, màn hình sẽ hiển thị:
  - `Nest application successfully started`
  - Swagger/REST API lắng nghe tại: `http://localhost:3000/api`
  - Dashboard Monitor xem tại: `http://localhost:3000/monitor`

---

### 📱 Terminal 2: Chạy Frontend Mobile Expo
```bash
pnpm --filter mobile run start
```
Terminal sẽ hiển thị mã **QR Code** của Metro Bundler.

---

## 8. Hướng dẫn chạy trên thiết bị / Máy ảo

### Cách 1: Chạy trên Điện thoại thật (Khuyên dùng)
1. Cài đặt app **Expo Go** trên điện thoại.
2. Đảm bảo điện thoại và máy tính **kết nối cùng một mạng Wi-Fi**.
3. Lưu ý sửa `EXPO_PUBLIC_API_URL` trong `apps/mobile/.env` thành địa chỉ IP nội bộ của máy tính (ví dụ: `http://192.168.1.15:3000/api`).
4. Mở camera điện thoại (hoặc app Expo Go) quét mã QR trên Terminal.

### Cách 2: Chạy trên Máy ảo Android (Android Emulator)
1. Mở Android Studio $\rightarrow$ Bật một thiết bị ảo AVD.
2. Trong Terminal chạy Expo, bấm phím **`a`** (Run on Android).
3. Sửa `EXPO_PUBLIC_API_URL` thành: `http://10.0.2.2:3000/api`.

### Cách 3: Chạy trên Trình duyệt Web (Web Preview)
Trong Terminal chạy Expo, bấm phím **`w`** (Open in web browser).

---

## 9. Các lỗi thường gặp và cách khắc phục

| Lỗi | Nguyên nhân | Cách khắc phục |
|---|---|---|
| `Unable to resolve @food-delivery/types` | Chưa build package types | Chạy lệnh: `pnpm build:types` rồi restart lại app. |
| `Network Error` khi đăng nhập / gọi API trên điện thoại | Thiết bị không gọi được vào `localhost:3000` | Thay `localhost` trong `apps/mobile/.env` bằng IP nội bộ máy tính (chạy `ipconfig` trên Windows để lấy IP IPv4). |
| `Cannot connect to Redis` | Sai cấu hình Upstash | Kiểm tra lại URL và Token trong `apps/api/.env`. |
| `Trợ lý AI chưa được cấu hình` | Thiếu GEMINI_API_KEY | Thêm key Gemini vào `apps/api/.env` (tạo key miễn phí tại Google AI Studio). |
| `Port 3000 already in use` | Cổng 3000 đang bị tiến trình khác chiếm | Đổi `PORT=3001` trong `apps/api/.env` hoặc tắt tiến trình cũ (`Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process`). |

---

*Tài liệu được khởi tạo và đồng bộ cho đồ án DeliFood.*
