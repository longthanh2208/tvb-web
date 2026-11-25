namespace Web_Baotri.Models
{
    public class KhachHangItemViewModel
    {
        public int MaKH { get; set; }
        public string HoTen { get; set; } = string.Empty;
        public string SoDienThoai { get; set; } = string.Empty;
        public string? DiaChi { get; set; }
        public bool DaNhacLich { get; set; }
        public string? BienSo { get; set; }
        public string? DongXe { get; set; }
        public int? SoODOHienTai { get; set; }
        public DateTime? NgayBaoDuongCuoi { get; set; }
        public int? SoNgayChuaBaoDuong { get; set; }

        // Trạng thái nhắc lịch theo quy định:
        // - Quá hạn (>90 ngày) & DaNhacLich = 0: "CanNhac" (Badge Đỏ)
        // - DaNhacLich = 1: "DaNhac" (Badge Xanh lá)
        // - Còn lại: "BinhThuong" (Badge Xám)
        public string TrangThaiNhacLich
        {
            get
            {
                if (DaNhacLich) return "DaNhac";
                if (NgayBaoDuongCuoi.HasValue && SoNgayChuaBaoDuong.HasValue && SoNgayChuaBaoDuong.Value > 90) return "CanNhac";
                return "BinhThuong";
            }
        }
    }

    public class CapNhatKhachHangRequest
    {
        public int MaKH { get; set; }
        public string HoTen { get; set; } = string.Empty;
        public string SoDienThoai { get; set; } = string.Empty;
        public string? DiaChi { get; set; }
    }

    public class DanhDauDaNhacRequest
    {
        public int MaKH { get; set; }
        public bool DaNhac { get; set; } = true;
    }
}
