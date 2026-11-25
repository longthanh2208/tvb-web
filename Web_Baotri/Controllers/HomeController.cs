using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Web_Baotri.Models;
using Web_Baotri.Services;

namespace Web_Baotri.Controllers
{
    public class HomeController : Controller
    {
        private readonly DatabaseService _dbService;

        public HomeController(DatabaseService dbService)
        {
            _dbService = dbService;
        }

        public async Task<IActionResult> Index()
        {
            EnsureDefaultSession();
            ViewBag.ActiveTab = "TiepNhan";
            var board = await _dbService.GetKanbanBoardAsync();
            return View(board);
        }

        private void EnsureDefaultSession()
        {
            if (HttpContext.Session.GetString("CurrentUser") == null)
            {
                // Mặc định đăng nhập với vai trò Lễ Tân như hình mẫu thiết kế
                var defaultUser = new UserSessionModel
                {
                    MaTK = 2,
                    TenDangNhap = "covan1",
                    HoTen = "Lễ Tân",
                    VaiTro = "Tiếp nhận"
                };
                HttpContext.Session.SetString("CurrentUser", JsonSerializer.Serialize(defaultUser));
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetBoardData()
        {
            var board = await _dbService.GetKanbanBoardAsync();
            return Json(new { success = true, data = board });
        }

        [HttpGet]
        public async Task<IActionResult> TraCuu(string bienSo)
        {
            if (string.IsNullOrWhiteSpace(bienSo))
                return Json(new { success = false, message = "Vui lòng nhập biển số xe!" });

            bienSo = bienSo.Trim().ToUpper();
            var regexBienSo = new Regex(@"^[0-9]{2}[A-Z]{1}[0-9A-Z]{1,2}-(([0-9]{3}\.[0-9]{2})|([0-9]{2}\.[0-9]{2})|([0-9]{4,5}))$", RegexOptions.IgnoreCase);
            if (!regexBienSo.IsMatch(bienSo))
                return Json(new { success = false, message = "Biển số xe không đúng định dạng! Ví dụ đúng: 60B1-123.45 hoặc 49AD-12212" });

            var result = await _dbService.TraCuuBienSoAsync(bienSo);
            return Json(new { success = true, data = result });
        }

        [HttpPost]
        public async Task<IActionResult> TiepNhanXe([FromBody] TiepNhanRequest request)
        {
            if (request == null)
                return Json(new { success = false, message = "Dữ liệu gửi lên không hợp lệ!" });

            request.BienSo = request.BienSo?.Trim().ToUpper() ?? "";
            request.TenKhach = request.TenKhach?.Trim() ?? "";
            request.SoDienThoai = request.SoDienThoai?.Trim() ?? "";

            // 1. Rào lỗi Biển số xe: đúng form biển số xe máy Việt Nam
            if (string.IsNullOrWhiteSpace(request.BienSo))
                return Json(new { success = false, message = "Vui lòng nhập biển số xe!" });

            var regexBienSo = new Regex(@"^[0-9]{2}[A-Z]{1}[0-9A-Z]{1,2}-(([0-9]{3}\.[0-9]{2})|([0-9]{2}\.[0-9]{2})|([0-9]{4,5}))$", RegexOptions.IgnoreCase);
            if (!regexBienSo.IsMatch(request.BienSo))
                return Json(new { success = false, message = "Biển số xe không đúng định dạng! Ví dụ đúng: 60B1-123.45 hoặc 49AD-12212" });

            // 2. Rào lỗi Tên khách hàng
            if (string.IsNullOrWhiteSpace(request.TenKhach) || request.TenKhach.Length < 2)
                return Json(new { success = false, message = "Vui lòng nhập tên khách hàng hợp lệ (từ 2 ký tự)!" });

            // 3. Rào lỗi Số điện thoại: không được là chữ, không quá 10 số, đúng 10 số bắt đầu bằng 0
            if (string.IsNullOrWhiteSpace(request.SoDienThoai))
                return Json(new { success = false, message = "Vui lòng nhập số điện thoại!" });

            if (!Regex.IsMatch(request.SoDienThoai, @"^[0-9]+$"))
                return Json(new { success = false, message = "Số điện thoại chỉ được chứa các chữ số, không được chứa chữ cái!" });

            if (request.SoDienThoai.Length > 10)
                return Json(new { success = false, message = "Số điện thoại không được vượt quá 10 số!" });

            if (request.SoDienThoai.Length != 10 || !request.SoDienThoai.StartsWith("0"))
                return Json(new { success = false, message = "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0 (ví dụ: 0987654321)!" });

            int maCoVan = 2;
            string? userJson = HttpContext.Session.GetString("CurrentUser");
            if (!string.IsNullOrEmpty(userJson))
            {
                try
                {
                    var user = JsonSerializer.Deserialize<UserSessionModel>(userJson);
                    if (user != null && user.MaTK > 0) maCoVan = user.MaTK;
                }
                catch { }
            }

            var result = await _dbService.TiepNhanXeAsync(request, maCoVan);
            if (result.Success)
            {
                return Json(new { success = true, message = result.Message, maPhieu = result.MaPhieu, tongTien = result.TongTien });
            }
            return Json(new { success = false, message = result.Message });
        }

        [HttpPost]
        public async Task<IActionResult> ChuyenTrangThai([FromBody] ChuyenTrangThaiModel request)
        {
            if (request == null || request.MaPhieu <= 0 || string.IsNullOrEmpty(request.TrangThaiMoi))
                return Json(new { success = false, message = "Thông tin không hợp lệ!" });

            var result = await _dbService.ChuyenTrangThaiAsync(request.MaPhieu, request.TrangThaiMoi);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpGet]
        public async Task<IActionResult> GetCatalog()
        {
            var (phuTung, dichVu) = await _dbService.GetCatalogAsync();
            return Json(new { success = true, phuTung, dichVu });
        }

        [HttpGet]
        public async Task<IActionResult> GetKTVList()
        {
            var data = await _dbService.GetDanhSachKTVAsync();
            return Json(new { success = true, data });
        }

        [HttpPost]
        public async Task<IActionResult> PhanCongKTV([FromBody] PhanCongKTVModel request)
        {
            if (request == null || request.MaPhieu <= 0 || request.MaKTV <= 0)
                return Json(new { success = false, message = "Thông tin phân công không hợp lệ!" });

            var result = await _dbService.PhanCongKTVAsync(request.MaPhieu, request.MaKTV);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpPost]
        public async Task<IActionResult> ChotHoaDon([FromBody] ChuyenTrangThaiModel request)
        {
            if (request == null || request.MaPhieu <= 0)
                return Json(new { success = false, message = "Mã phiếu không hợp lệ!" });

            var result = await _dbService.ChotHoaDonAsync(request.MaPhieu);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpGet]
        public async Task<IActionResult> GetInHoaDon(int maPhieu)
        {
            if (maPhieu <= 0)
                return Json(new { success = false, message = "Mã phiếu không hợp lệ!" });

            var (hoaDon, chiTiet) = await _dbService.GetInHoaDonAsync(maPhieu);
            return Json(new { success = hoaDon != null, hoaDon, chiTiet });
        }

        [HttpGet]
        public async Task<IActionResult> GetChiTietPhieu(int maPhieu)
        {
            if (maPhieu <= 0)
                return Json(new { success = false, message = "Mã phiếu không hợp lệ!" });

            var (phieu, chiTiet) = await _dbService.GetChiTietPhieuAsync(maPhieu);
            return Json(new { success = phieu != null, phieu, chiTiet });
        }

        [HttpPost]
        public async Task<IActionResult> ThemHangMucPhieu([FromBody] ThemHangMucPhieuModel request)
        {
            if (request == null || request.MaPhieu <= 0 || string.IsNullOrEmpty(request.MaHangMuc))
                return Json(new { success = false, message = "Thông tin hạng mục không hợp lệ!" });

            if (request.SoLuong <= 0) request.SoLuong = 1;

            var result = await _dbService.ThemHangMucPhieuAsync(request.MaPhieu, request.LoaiMuc, request.MaHangMuc, request.SoLuong);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpPost]
        public async Task<IActionResult> CapNhatSoLuongHangMuc([FromBody] CapNhatSoLuongModel request)
        {
            if (request == null || request.MaCT <= 0 || request.SoLuongMoi <= 0)
                return Json(new { success = false, message = "Số lượng phải lớn hơn 0!" });

            var result = await _dbService.CapNhatSoLuongHangMucAsync(request.MaCT, request.SoLuongMoi);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpPost]
        public async Task<IActionResult> XoaHangMucPhieu([FromBody] XoaHangMucModel request)
        {
            if (request == null || request.MaCT <= 0)
                return Json(new { success = false, message = "Mã hạng mục không hợp lệ!" });

            var result = await _dbService.XoaHangMucPhieuAsync(request.MaCT);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpPost]
        public async Task<IActionResult> Login([FromBody] LoginViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.TenDangNhap) || string.IsNullOrWhiteSpace(model.MatKhau))
                return Json(new { success = false, message = "Vui lòng điền đầy đủ tên đăng nhập và mật khẩu!" });

            var user = await _dbService.LoginAsync(model.TenDangNhap.Trim(), model.MatKhau);
            if (user == null)
            {
                return Json(new { success = false, message = "Tên đăng nhập hoặc mật khẩu không chính xác!" });
            }

            HttpContext.Session.SetString("CurrentUser", JsonSerializer.Serialize(user));
            return Json(new { success = true, message = "Đăng nhập thành công!", user });
        }

        [HttpPost]
        public IActionResult Logout()
        {
            HttpContext.Session.Remove("CurrentUser");
            EnsureDefaultSession();
            return Json(new { success = true, message = "Đã đăng xuất!" });
        }

        [HttpPost]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.MatKhauCu) || string.IsNullOrWhiteSpace(model.MatKhauMoi))
                return Json(new { success = false, message = "Vui lòng nhập mật khẩu cũ và mới!" });

            if (model.MatKhauMoi != model.XacNhanMatKhauMoi)
                return Json(new { success = false, message = "Mật khẩu xác nhận không khớp!" });

            string? userJson = HttpContext.Session.GetString("CurrentUser");
            if (string.IsNullOrEmpty(userJson))
                return Json(new { success = false, message = "Vui lòng đăng nhập lại!" });

            var user = JsonSerializer.Deserialize<UserSessionModel>(userJson);
            if (user == null)
                return Json(new { success = false, message = "Không xác định tài khoản!" });

            var result = await _dbService.ChangePasswordAsync(user.MaTK, model.MatKhauCu, model.MatKhauMoi);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpGet]
        public IActionResult GetCurrentUser()
        {
            EnsureDefaultSession();
            string? userJson = HttpContext.Session.GetString("CurrentUser");
            if (!string.IsNullOrEmpty(userJson))
            {
                var user = JsonSerializer.Deserialize<UserSessionModel>(userJson);
                return Json(new { success = true, user });
            }
            return Json(new { success = false });
        }

        [HttpGet]
        public async Task<IActionResult> GetDanhSachTaiKhoan()
        {
            var list = await _dbService.GetDanhSachTaiKhoanAsync();
            return Json(new { success = true, data = list });
        }

        // ================= TAB: QUẢN LÝ DỊCH VỤ =================
        public async Task<IActionResult> DichVu()
        {
            EnsureDefaultSession();
            ViewBag.ActiveTab = "DichVu";
            var list = await _dbService.GetDanhSachDichVuAsync();
            return View(list);
        }

        [HttpGet]
        public async Task<IActionResult> GetDichVuList(string? tuKhoa)
        {
            var data = await _dbService.GetDanhSachDichVuAsync(tuKhoa);
            return Json(new { success = true, data });
        }

        [HttpPost]
        public async Task<IActionResult> ThemDichVu([FromBody] DichVuModel model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.MaDV) || string.IsNullOrWhiteSpace(model.TenDV))
                return Json(new { success = false, message = "Vui lòng nhập đầy đủ Mã dịch vụ và Tên dịch vụ!" });

            if (model.DonGia < 0)
                return Json(new { success = false, message = "Đơn giá dịch vụ không được nhỏ hơn 0!" });

            var result = await _dbService.ThemDichVuAsync(model);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpPost]
        public async Task<IActionResult> CapNhatDichVu([FromBody] DichVuModel model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.MaDV) || string.IsNullOrWhiteSpace(model.TenDV))
                return Json(new { success = false, message = "Vui lòng nhập đầy đủ Mã dịch vụ và Tên dịch vụ!" });

            if (model.DonGia < 0)
                return Json(new { success = false, message = "Đơn giá dịch vụ không được nhỏ hơn 0!" });

            var result = await _dbService.CapNhatDichVuAsync(model);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpPost]
        public async Task<IActionResult> XoaDichVu([FromBody] DichVuModel model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.MaDV))
                return Json(new { success = false, message = "Mã dịch vụ không hợp lệ!" });

            var result = await _dbService.XoaDichVuAsync(model.MaDV);
            return Json(new { success = result.Success, message = result.Message });
        }

        // ================= TAB: KHÁCH HÀNG & NHẮC LỊCH =================
        public async Task<IActionResult> KhachHang()
        {
            EnsureDefaultSession();
            ViewBag.ActiveTab = "KhachHang";
            var list = await _dbService.GetDanhSachKhachHangAsync();
            return View(list);
        }

        [HttpGet]
        public async Task<IActionResult> GetKhachHangList(string? tuKhoa)
        {
            var data = await _dbService.GetDanhSachKhachHangAsync(tuKhoa);
            return Json(new { success = true, data });
        }

        [HttpPost]
        public async Task<IActionResult> DanhDauDaNhac([FromBody] DanhDauDaNhacRequest req)
        {
            if (req == null || req.MaKH <= 0)
                return Json(new { success = false, message = "Khách hàng không hợp lệ!" });

            var result = await _dbService.DanhDauDaNhacLichAsync(req.MaKH, req.DaNhac);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpPost]
        public async Task<IActionResult> CapNhatKhachHang([FromBody] CapNhatKhachHangRequest req)
        {
            if (req == null || req.MaKH <= 0 || string.IsNullOrWhiteSpace(req.HoTen) || string.IsNullOrWhiteSpace(req.SoDienThoai))
                return Json(new { success = false, message = "Vui lòng nhập tên và số điện thoại khách hàng!" });

            if (!Regex.IsMatch(req.SoDienThoai, @"^[0-9]+$") || req.SoDienThoai.Length != 10 || !req.SoDienThoai.StartsWith("0"))
                return Json(new { success = false, message = "Số điện thoại phải gồm đúng 10 số và bắt đầu bằng số 0!" });

            var result = await _dbService.CapNhatKhachHangAsync(req.MaKH, req.HoTen, req.SoDienThoai, req.DiaChi);
            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpGet]
        public async Task<IActionResult> TraCuuSoBaoDuong(string bienSo)
        {
            if (string.IsNullOrWhiteSpace(bienSo))
                return Json(new { success = false, message = "Biển số xe không được để trống!" });

            var (thongTinXe, lichSu) = await _dbService.GetSoBaoDuongXeAsync(bienSo);
            return Json(new { success = true, thongTinXe, lichSu });
        }

        [HttpGet]
        public async Task<IActionResult> GetChiTietLichSuPhieu(int maPhieu, string bienSo)
        {
            if (maPhieu <= 0 || string.IsNullOrWhiteSpace(bienSo))
                return Json(new { success = false, message = "Thông tin tra cứu không hợp lệ!" });

            var data = await _dbService.GetChiTietLichSuPhieuAsync(maPhieu, bienSo);
            return Json(new { success = true, data });
        }

        // ================= TAB: LỊCH HẸN TỪ APP =================
        public async Task<IActionResult> LichHen()
        {
            EnsureDefaultSession();
            ViewBag.ActiveTab = "LichHen";
            var list = await _dbService.GetDanhSachLichHenAsync();
            return View(list);
        }

        [HttpGet]
        public async Task<IActionResult> GetLichHenList()
        {
            var data = await _dbService.GetDanhSachLichHenAsync();
            return Json(new { success = true, data });
        }

        [HttpPost]
        public async Task<IActionResult> TiepNhanLichHen([FromBody] TiepNhanLichHenRequest req)
        {
            if (req == null || req.MaPhieu <= 0)
                return Json(new { success = false, message = "Thông tin phiếu hẹn không hợp lệ!" });

            int maCoVan = 2;
            string? userJson = HttpContext.Session.GetString("CurrentUser");
            if (!string.IsNullOrEmpty(userJson))
            {
                try
                {
                    var user = JsonSerializer.Deserialize<UserSessionModel>(userJson);
                    if (user != null && user.MaTK > 0) maCoVan = user.MaTK;
                }
                catch { }
            }

            var result = await _dbService.TiepNhanLichHenAsync(req.MaPhieu, maCoVan, req.SoODOLucNhan, req.GhiChuThem);
            return Json(new { success = result.Success, message = result.Message });
        }

        // ================= TAB: BÁO CÁO THỐNG KÊ =================
        public async Task<IActionResult> BaoCao()
        {
            EnsureDefaultSession();
            ViewBag.ActiveTab = "BaoCao";
            var data = await _dbService.GetBaoCaoDataAsync();
            return View(data);
        }

        [HttpGet]
        public async Task<IActionResult> GetBaoCaoData()
        {
            var data = await _dbService.GetBaoCaoDataAsync();
            return Json(new { success = true, data });
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }

    public class ChuyenTrangThaiModel
    {
        public int MaPhieu { get; set; }
        public string TrangThaiMoi { get; set; } = string.Empty;
    }
}
