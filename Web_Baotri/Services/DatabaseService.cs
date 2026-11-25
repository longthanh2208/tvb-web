using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Web_Baotri.Models;

namespace Web_Baotri.Services
{
    public class DatabaseService
    {
        private readonly string _connectionString;

        public DatabaseService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection") 
                ?? "Server=.\\SQLEXPRESS;Database=QuanLyBaoTriXeMay;Integrated Security=True;Encrypt=False;TrustServerCertificate=True;Connect Timeout=30;Max Pool Size=100;Pooling=true;";
        }

        private IDbConnection CreateConnection() => new SqlConnection(_connectionString);

        public async Task<KanbanBoardViewModel> GetKanbanBoardAsync()
        {
            try
            {
                using var conn = CreateConnection();
                var items = (await conn.QueryAsync<KanbanItem>(
                    "sp_DieuPhoi_LayBangTrangThai",
                    new { TrangThai = (string?)null },
                    commandType: CommandType.StoredProcedure,
                    commandTimeout: 15
                )).ToList();

                return new KanbanBoardViewModel
                {
                    ChoSua = items.Where(x => x.TrangThai == "ChoSua").ToList(),
                    DangSua = items.Where(x => x.TrangThai == "DangSua").ToList(),
                    ChoThanhToan = items.Where(x => x.TrangThai == "ChoThanhToan").ToList()
                };
            }
            catch
            {
                // Trả về danh sách rỗng nếu tạm thời không kết nối được để tránh sập web
                return new KanbanBoardViewModel();
            }
        }

        public async Task<TraCuuResponse> TraCuuBienSoAsync(string bienSo)
        {
            using var conn = CreateConnection();
            using var multi = await conn.QueryMultipleAsync(
                "sp_TiepNhan_TraCuuBienSo",
                new { BienSo = bienSo },
                commandType: CommandType.StoredProcedure
            );

            var first = await multi.ReadFirstOrDefaultAsync<dynamic>();
            if (first == null)
            {
                return new TraCuuResponse { TonTai = false, ThongBao = "Không tìm thấy thông tin xe!" };
            }

            var dict = first as IDictionary<string, object>;
            int tonTai = 0;
            if (dict != null && dict.TryGetValue("TonTai", out var val) && val != null)
            {
                int.TryParse(val.ToString(), out tonTai);
            }

            if (tonTai == 0)
            {
                return new TraCuuResponse
                {
                    TonTai = false,
                    BienSo = bienSo,
                    ThongBao = "Xe chưa từng vào xưởng, vui lòng tạo hồ sơ mới."
                };
            }

            return new TraCuuResponse
            {
                TonTai = true,
                BienSo = dict?.TryGetValue("BienSo", out var bs) == true ? bs?.ToString() : bienSo,
                DongXe = dict?.TryGetValue("DongXe", out var dx) == true ? dx?.ToString() : "",
                TenKhachHang = dict?.TryGetValue("TenKhachHang", out var tkh) == true ? tkh?.ToString() : "",
                SoDienThoai = dict?.TryGetValue("SoDienThoai", out var sdt) == true ? sdt?.ToString() : "",
                SoODOHienTai = dict?.TryGetValue("SoODOHienTai", out var odo) == true && int.TryParse(odo?.ToString(), out int odoVal) ? odoVal : 0
            };
        }

        public async Task<(bool Success, string Message, int MaPhieu, decimal TongTien)> TiepNhanXeAsync(TiepNhanRequest req, int maCoVan = 2)
        {
            try
            {
                using var conn = CreateConnection();
                // 1. Tạo hoặc cập nhật khách và xe
                string dongXe = !string.IsNullOrWhiteSpace(req.DongXe) ? req.DongXe : "Xe máy";
                await conn.ExecuteAsync(
                    "sp_TiepNhan_TaoKhachVaXe",
                    new
                    {
                        HoTen = req.TenKhach.Trim(),
                        SoDienThoai = req.SoDienThoai.Trim(),
                        DiaChi = (string?)null,
                        BienSo = req.BienSo.Trim().ToUpper(),
                        DongXe = dongXe,
                        SoKhung = (string?)null,
                        SoODOHienTai = req.SoODOLucNhan
                    },
                    commandType: CommandType.StoredProcedure
                );

                // 2. Tạo phiếu sửa chữa với trạng thái mặc định ChoSua
                var pars = new DynamicParameters();
                pars.Add("BienSo", req.BienSo.Trim().ToUpper());
                pars.Add("MaCoVan", maCoVan);
                pars.Add("SoODOLucNhan", req.SoODOLucNhan);
                pars.Add("GhiChuTinhTrang", req.GhiChuTinhTrang);
                pars.Add("MaPhieuMoi", dbType: DbType.Int32, direction: ParameterDirection.Output);

                await conn.ExecuteAsync("sp_PhieuSuaChua_TaoMoi", pars, commandType: CommandType.StoredProcedure);
                int maPhieuMoi = pars.Get<int>("MaPhieuMoi");

                // 3. Thêm các dịch vụ và phụ tùng đã chọn (nếu có)
                if (req.HangMucChon != null && req.HangMucChon.Any())
                {
                    foreach (var item in req.HangMucChon)
                    {
                        if (item.LoaiMuc == "PhuTung" && !string.IsNullOrWhiteSpace(item.MaHangMuc))
                        {
                            await conn.ExecuteAsync(
                                "sp_ChiTietPhieu_ThemPhuTung",
                                new 
                                { 
                                    MaPhieu = maPhieuMoi, 
                                    MaPT = item.MaHangMuc, 
                                    SoLuong = item.SoLuong > 0 ? item.SoLuong : 1, 
                                    DonGiaCustom = item.DonGia > 0 ? (decimal?)item.DonGia : null 
                                },
                                commandType: CommandType.StoredProcedure
                            );
                        }
                        else if (item.LoaiMuc == "DichVu" && !string.IsNullOrWhiteSpace(item.MaHangMuc))
                        {
                            await conn.ExecuteAsync(
                                "sp_ChiTietPhieu_ThemDichVu",
                                new 
                                { 
                                    MaPhieu = maPhieuMoi, 
                                    MaDV = item.MaHangMuc, 
                                    SoLuong = item.SoLuong > 0 ? item.SoLuong : 1, 
                                    DonGiaCustom = item.DonGia > 0 ? (decimal?)item.DonGia : null 
                                },
                                commandType: CommandType.StoredProcedure
                            );
                        }
                    }
                }

                // 4. Lấy lại tổng tiền đã được sp_PhieuSuaChua_CapNhatTongTien tính toán
                decimal tongTien = await conn.ExecuteScalarAsync<decimal>(
                    "SELECT ISNULL(TongTien, 0) FROM PhieuSuaChua WHERE MaPhieu = @MaPhieu",
                    new { MaPhieu = maPhieuMoi }
                );

                return (true, "Tiếp nhận xe thành công!", maPhieuMoi, tongTien);
            }
            catch (Exception ex)
            {
                return (false, ex.Message, 0, 0);
            }
        }

        public async Task<(bool Success, string Message)> ChuyenTrangThaiAsync(int maPhieu, string trangThaiMoi)
        {
            try
            {
                using var conn = CreateConnection();
                var result = await conn.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_DieuPhoi_CapNhatTrangThai",
                    new { MaPhieu = maPhieu, TrangThaiMoi = trangThaiMoi },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Cập nhật trạng thái thành công!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Message)> PhanCongKTVAsync(int maPhieu, int maKTV)
        {
            try
            {
                using var conn = CreateConnection();
                var result = await conn.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_DieuPhoi_PhanCongKTV",
                    new { MaPhieu = maPhieu, MaKTV = maKTV },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Phân công kỹ thuật viên thành công, phiếu đã chuyển sang trạng thái Đang sửa!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Message)> ChotHoaDonAsync(int maPhieu)
        {
            try
            {
                using var conn = CreateConnection();
                var result = await conn.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_ThanhToan_ChotHoaDon",
                    new { MaPhieu = maPhieu },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Thanh toán phiếu thành công! Đã trừ kho phụ tùng và cập nhật hồ sơ xe.");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(dynamic? Phieu, IEnumerable<dynamic> ChiTiet)> GetChiTietPhieuAsync(int maPhieu)
        {
            try
            {
                using var conn = CreateConnection();
                using var multi = await conn.QueryMultipleAsync(
                    "sp_PhieuSuaChua_LayChiTiet",
                    new { MaPhieu = maPhieu },
                    commandType: CommandType.StoredProcedure
                );
                var phieu = await multi.ReadFirstOrDefaultAsync<dynamic>();
                var chiTiet = (await multi.ReadAsync<dynamic>()).ToList();
                return (phieu, chiTiet);
            }
            catch
            {
                return (null, Enumerable.Empty<dynamic>());
            }
        }

        public async Task<(dynamic? HoaDon, IEnumerable<dynamic> ChiTiet)> GetInHoaDonAsync(int maPhieu)
        {
            try
            {
                using var conn = CreateConnection();
                using var multi = await conn.QueryMultipleAsync(
                    "sp_ThanhToan_InHoaDon",
                    new { MaPhieu = maPhieu },
                    commandType: CommandType.StoredProcedure
                );
                var hoaDon = await multi.ReadFirstOrDefaultAsync<dynamic>();
                var chiTiet = (await multi.ReadAsync<dynamic>()).ToList();
                return (hoaDon, chiTiet);
            }
            catch
            {
                return (null, Enumerable.Empty<dynamic>());
            }
        }

        public async Task<(IEnumerable<PhuTungDto> PhuTung, IEnumerable<DichVuDto> DichVu)> GetCatalogAsync()
        {
            try
            {
                using var conn = CreateConnection();
                var phuTung = await conn.QueryAsync<PhuTungDto>("sp_PhuTung_LayDanhSach", commandType: CommandType.StoredProcedure);
                var dichVu = await conn.QueryAsync<DichVuDto>("sp_DichVu_LayDanhSach", commandType: CommandType.StoredProcedure);
                return (phuTung, dichVu);
            }
            catch
            {
                return (Enumerable.Empty<PhuTungDto>(), Enumerable.Empty<DichVuDto>());
            }
        }

        public async Task<IEnumerable<KtvDto>> GetDanhSachKTVAsync()
        {
            try
            {
                using var conn = CreateConnection();
                return await conn.QueryAsync<KtvDto>("sp_TaiKhoan_LayDanhSachKTV", commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return Enumerable.Empty<KtvDto>();
            }
        }

        public async Task<(bool Success, string Message)> ThemHangMucPhieuAsync(int maPhieu, string loaiMuc, string maHangMuc, int soLuong)
        {
            try
            {
                using var conn = CreateConnection();
                if (loaiMuc == "PhuTung")
                {
                    await conn.ExecuteAsync(
                        "sp_ChiTietPhieu_ThemPhuTung",
                        new { MaPhieu = maPhieu, MaPT = maHangMuc, SoLuong = soLuong, DonGiaCustom = (decimal?)null },
                        commandType: CommandType.StoredProcedure
                    );
                }
                else
                {
                    await conn.ExecuteAsync(
                        "sp_ChiTietPhieu_ThemDichVu",
                        new { MaPhieu = maPhieu, MaDV = maHangMuc, SoLuong = soLuong, DonGiaCustom = (decimal?)null },
                        commandType: CommandType.StoredProcedure
                    );
                }
                return (true, "Đã thêm hạng mục vào phiếu thành công!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Message)> CapNhatSoLuongHangMucAsync(int maCT, int soLuongMoi)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.ExecuteAsync(
                    "sp_ChiTietPhieu_CapNhatSoLuong",
                    new { MaCT = maCT, SoLuongMoi = soLuongMoi },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Cập nhật số lượng thành công!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Message)> XoaHangMucPhieuAsync(int maCT)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.ExecuteAsync(
                    "sp_ChiTietPhieu_XoaHangMuc",
                    new { MaCT = maCT },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Đã xóa hạng mục khỏi phiếu!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<UserSessionModel?> LoginAsync(string tenDangNhap, string matKhau)
        {
            using var conn = CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<UserSessionModel>(
                "sp_TaiKhoan_DangNhap",
                new { TenDangNhap = tenDangNhap, MatKhau = matKhau },
                commandType: CommandType.StoredProcedure
            );
        }

        public async Task<IEnumerable<dynamic>> GetDanhSachTaiKhoanAsync()
        {
            using var conn = CreateConnection();
            return await conn.QueryAsync(
                "SELECT MaTK, TenDangNhap, HoTen, VaiTro, TrangThai FROM TaiKhoan ORDER BY MaTK ASC"
            );
        }

        public async Task<(bool Success, string Message)> ChangePasswordAsync(int maTK, string matKhauCu, string matKhauMoi)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.ExecuteAsync(
                    "sp_TaiKhoan_DoiMatKhau",
                    new { MaTK = maTK, MatKhauCu = matKhauCu, MatKhauMoi = matKhauMoi },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Đổi mật khẩu thành công!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        // ================= DỊCH VỤ CRUD =================
        public async Task<IEnumerable<DichVuModel>> GetDanhSachDichVuAsync(string? tuKhoa = null)
        {
            try
            {
                using var conn = CreateConnection();
                return await conn.QueryAsync<DichVuModel>(
                    "sp_DichVu_TimKiem",
                    new { TuKhoa = tuKhoa ?? "" },
                    commandType: CommandType.StoredProcedure,
                    commandTimeout: 30
                );
            }
            catch
            {
                return Enumerable.Empty<DichVuModel>();
            }
        }

        public async Task<(bool Success, string Message)> ThemDichVuAsync(DichVuModel dv)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.ExecuteAsync(
                    "sp_DichVu_ThemMoi",
                    new { MaDV = dv.MaDV.Trim().ToUpper(), TenDV = dv.TenDV.Trim(), DonGia = dv.DonGia, MoTa = dv.MoTa },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Thêm dịch vụ thành công!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Message)> CapNhatDichVuAsync(DichVuModel dv)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.ExecuteAsync(
                    "sp_DichVu_CapNhat",
                    new { MaDV = dv.MaDV.Trim().ToUpper(), TenDV = dv.TenDV.Trim(), DonGia = dv.DonGia, MoTa = dv.MoTa },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Cập nhật dịch vụ thành công!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Message)> XoaDichVuAsync(string maDV)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.ExecuteAsync(
                    "sp_DichVu_Xoa",
                    new { MaDV = maDV },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Đã xóa dịch vụ thành công!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        // ================= KHÁCH HÀNG & NHẮC LỊCH BẢO DƯỠNG =================
        public async Task<IEnumerable<KhachHangItemViewModel>> GetDanhSachKhachHangAsync(string? tuKhoa = null)
        {
            try
            {
                using var conn = CreateConnection();
                string sql = @"
                    SELECT 
                        kh.MaKH,
                        kh.HoTen,
                        kh.SoDienThoai,
                        kh.DiaChi,
                        kh.DaNhacLich,
                        xm.BienSo,
                        xm.DongXe,
                        xm.SoODOHienTai,
                        xm.NgayBaoDuongCuoi,
                        DATEDIFF(DAY, xm.NgayBaoDuongCuoi, GETDATE()) AS SoNgayChuaBaoDuong
                    FROM KhachHang kh
                    LEFT JOIN XeMay xm ON kh.MaKH = xm.MaKH
                    WHERE (@TuKhoa IS NULL OR @TuKhoa = '' 
                           OR kh.HoTen LIKE '%' + @TuKhoa + '%' 
                           OR kh.SoDienThoai LIKE '%' + @TuKhoa + '%' 
                           OR xm.BienSo LIKE '%' + @TuKhoa + '%'
                           OR xm.DongXe LIKE '%' + @TuKhoa + '%')
                    ORDER BY 
                        CASE WHEN xm.NgayBaoDuongCuoi IS NOT NULL AND DATEDIFF(DAY, xm.NgayBaoDuongCuoi, GETDATE()) > 90 AND ISNULL(kh.DaNhacLich, 0) = 0 THEN 0 ELSE 1 END ASC,
                        kh.MaKH DESC;";
                return await conn.QueryAsync<KhachHangItemViewModel>(sql, new { TuKhoa = tuKhoa?.Trim() }, commandTimeout: 30);
            }
            catch
            {
                return Enumerable.Empty<KhachHangItemViewModel>();
            }
        }

        public async Task<(bool Success, string Message)> DanhDauDaNhacLichAsync(int maKH, bool daNhac = true)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.ExecuteAsync(
                    "sp_ChamSocKH_DanhDauDaNhac",
                    new { MaKH = maKH, DaNhac = daNhac },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Đã cập nhật trạng thái nhắc lịch!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(bool Success, string Message)> CapNhatKhachHangAsync(int maKH, string hoTen, string soDienThoai, string? diaChi)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.ExecuteAsync(
                    "UPDATE KhachHang SET HoTen = @HoTen, SoDienThoai = @SoDienThoai, DiaChi = @DiaChi WHERE MaKH = @MaKH",
                    new { MaKH = maKH, HoTen = hoTen.Trim(), SoDienThoai = soDienThoai.Trim(), DiaChi = diaChi?.Trim() }
                );
                return (true, "Cập nhật thông tin khách hàng thành công!");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task<(dynamic? ThongTinXe, IEnumerable<dynamic> LichSu)> GetSoBaoDuongXeAsync(string bienSo)
        {
            try
            {
                using var conn = CreateConnection();
                using var multi = await conn.QueryMultipleAsync(
                    "sp_KhachHang_TraCuuSoBaoDuong",
                    new { BienSo = bienSo },
                    commandType: CommandType.StoredProcedure
                );
                var thongTinXe = await multi.ReadFirstOrDefaultAsync<dynamic>();
                var lichSu = (await multi.ReadAsync<dynamic>()).ToList();
                return (thongTinXe, lichSu);
            }
            catch
            {
                return (null, Enumerable.Empty<dynamic>());
            }
        }

        public async Task<IEnumerable<dynamic>> GetChiTietLichSuPhieuAsync(int maPhieu, string bienSo)
        {
            try
            {
                using var conn = CreateConnection();
                return await conn.QueryAsync<dynamic>(
                    "sp_KhachHang_ChiTietPhieuLichSu",
                    new { MaPhieu = maPhieu, BienSo = bienSo },
                    commandType: CommandType.StoredProcedure
                );
            }
            catch
            {
                return Enumerable.Empty<dynamic>();
            }
        }

        // ================= LỊCH HẸN TỪ APP =================
        public async Task<IEnumerable<LichHenItemViewModel>> GetDanhSachLichHenAsync()
        {
            try
            {
                using var conn = CreateConnection();
                string sql = @"
                    SELECT 
                        p.MaPhieu,
                        p.BienSo,
                        p.NgayTiepNhan,
                        p.SoODOLucNhan,
                        p.GhiChuTinhTrang,
                        p.TongTien,
                        p.TrangThai,
                        xm.DongXe,
                        kh.MaKH,
                        kh.HoTen AS TenKhachHang,
                        kh.SoDienThoai,
                        kh.DiaChi
                    FROM PhieuSuaChua p
                    INNER JOIN XeMay xm ON p.BienSo = xm.BienSo
                    INNER JOIN KhachHang kh ON xm.MaKH = kh.MaKH
                    WHERE p.TrangThai = N'DatLich'
                    ORDER BY p.NgayTiepNhan DESC;";
                return await conn.QueryAsync<LichHenItemViewModel>(sql, commandTimeout: 30);
            }
            catch
            {
                return Enumerable.Empty<LichHenItemViewModel>();
            }
        }

        public async Task<(bool Success, string Message)> TiepNhanLichHenAsync(int maPhieu, int maCoVan, int? odo, string? ghiChu)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.ExecuteAsync(
                    "sp_CoVan_TiepNhanLichHen",
                    new { MaPhieu = maPhieu, MaCoVan = maCoVan, SoODOLucNhan = odo, GhiChuThem = ghiChu },
                    commandType: CommandType.StoredProcedure
                );
                return (true, "Đã tiếp nhận lịch hẹn thành công! Phiếu đã chuyển sang Chờ sửa trên Bàn tiếp nhận.");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        // ================= BÁO CÁO THỐNG KÊ =================
        public async Task<BaoCaoViewModel> GetBaoCaoDataAsync()
        {
            using var conn = CreateConnection();
            var vm = new BaoCaoViewModel();
            try
            {
                vm.DoanhThuHomNay = await conn.ExecuteScalarAsync<decimal>(
                    "SELECT ISNULL(SUM(TongTien), 0) FROM PhieuSuaChua WHERE TrangThai = 'DaThanhToan' AND CAST(NgayHoanThanh AS DATE) = CAST(GETDATE() AS DATE)"
                );
                vm.DoanhThuThang = await conn.ExecuteScalarAsync<decimal>(
                    "SELECT ISNULL(SUM(TongTien), 0) FROM PhieuSuaChua WHERE TrangThai = 'DaThanhToan' AND MONTH(NgayHoanThanh) = MONTH(GETDATE()) AND YEAR(NgayHoanThanh) = YEAR(GETDATE())"
                );
                vm.SoXeChoSua = await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM PhieuSuaChua WHERE TrangThai = 'ChoSua'");
                vm.SoXeDangSua = await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM PhieuSuaChua WHERE TrangThai = 'DangSua'");
                vm.SoXeChoThanhToan = await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM PhieuSuaChua WHERE TrangThai = 'ChoThanhToan'");
                vm.SoXeHoanThanhHomNay = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(1) FROM PhieuSuaChua WHERE TrangThai = 'DaThanhToan' AND CAST(NgayHoanThanh AS DATE) = CAST(GETDATE() AS DATE)"
                );
                vm.PhuTungCanhBao = (await conn.QueryAsync<dynamic>("sp_PhuTung_CanhBaoTonKho", commandType: CommandType.StoredProcedure)).ToList();
                vm.PhieuSuaMoiNhat = (await conn.QueryAsync<dynamic>(
                    @"SELECT TOP 10 p.MaPhieu, p.BienSo, p.TongTien, p.NgayHoanThanh, kh.HoTen, xm.DongXe 
                      FROM PhieuSuaChua p 
                      INNER JOIN XeMay xm ON p.BienSo = xm.BienSo 
                      INNER JOIN KhachHang kh ON xm.MaKH = kh.MaKH 
                      WHERE p.TrangThai = 'DaThanhToan' 
                      ORDER BY p.NgayHoanThanh DESC"
                )).ToList();
            }
            catch { }
            return vm;
        }
    }
}
