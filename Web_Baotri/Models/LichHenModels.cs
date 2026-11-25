namespace Web_Baotri.Models
{
    public class LichHenItemViewModel
    {
        public int MaPhieu { get; set; }
        public string BienSo { get; set; } = string.Empty;
        public string? DongXe { get; set; }
        public string? TenKhachHang { get; set; }
        public string? SoDienThoai { get; set; }
        public string? DiaChi { get; set; }
        public DateTime NgayTiepNhan { get; set; }
        public int? SoODOLucNhan { get; set; }
        public string? GhiChuTinhTrang { get; set; }
        public decimal TongTien { get; set; }
        public string TrangThai { get; set; } = "DatLich";
    }

    public class TiepNhanLichHenRequest
    {
        public int MaPhieu { get; set; }
        public int? SoODOLucNhan { get; set; }
        public string? GhiChuThem { get; set; }
    }
}
