namespace Web_Baotri.Models
{
    public class TiepNhanChiTietItem
    {
        public string LoaiMuc { get; set; } = "DichVu"; // 'PhuTung' hoặc 'DichVu'
        public string MaHangMuc { get; set; } = string.Empty;
        public string TenHangMuc { get; set; } = string.Empty;
        public int SoLuong { get; set; } = 1;
        public decimal DonGia { get; set; }
    }

    public class TiepNhanRequest
    {
        public string BienSo { get; set; } = string.Empty;
        public string TenKhach { get; set; } = string.Empty;
        public string SoDienThoai { get; set; } = string.Empty;
        public string? GhiChuTinhTrang { get; set; }
        public string? DongXe { get; set; }
        public int SoODOLucNhan { get; set; } = 0;
        public List<TiepNhanChiTietItem>? HangMucChon { get; set; } = new List<TiepNhanChiTietItem>();
    }

    public class PhanCongKTVModel
    {
        public int MaPhieu { get; set; }
        public int MaKTV { get; set; }
    }

    public class TraCuuResponse
    {
        public bool TonTai { get; set; }
        public string? BienSo { get; set; }
        public string? DongXe { get; set; }
        public string? TenKhachHang { get; set; }
        public string? SoDienThoai { get; set; }
        public int SoODOHienTai { get; set; }
        public string? ThongBao { get; set; }
    }

    public class PhuTungDto
    {
        public string MaPT { get; set; } = string.Empty;
        public string TenPT { get; set; } = string.Empty;
        public string? DonViTinh { get; set; }
        public decimal GiaBan { get; set; }
        public int SoLuongTon { get; set; }
        public string? DongXeTuongThich { get; set; }
    }

    public class DichVuDto
    {
        public string MaDV { get; set; } = string.Empty;
        public string TenDV { get; set; } = string.Empty;
        public decimal DonGia { get; set; }
        public string? MoTa { get; set; }
    }

    public class KtvDto
    {
        public int MaTK { get; set; }
        public string TenDangNhap { get; set; } = string.Empty;
        public string HoTen { get; set; } = string.Empty;
        public int SoXeDangLam { get; set; }
    }

    public class ThemHangMucPhieuModel
    {
        public int MaPhieu { get; set; }
        public string LoaiMuc { get; set; } = "DichVu"; // 'PhuTung' hoặc 'DichVu'
        public string MaHangMuc { get; set; } = string.Empty;
        public int SoLuong { get; set; } = 1;
    }

    public class CapNhatSoLuongModel
    {
        public int MaCT { get; set; }
        public int SoLuongMoi { get; set; }
    }

    public class XoaHangMucModel
    {
        public int MaCT { get; set; }
    }
}
