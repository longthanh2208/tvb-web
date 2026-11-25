using System;

namespace Web_Baotri.Models
{
    public class KanbanItem
    {
        public int MaPhieu { get; set; }
        public string BienSo { get; set; } = string.Empty;
        public string DongXe { get; set; } = string.Empty;
        public string TenKhachHang { get; set; } = string.Empty;
        public string SoDienThoai { get; set; } = string.Empty;
        public int SoODOLucNhan { get; set; }
        public string? GhiChuTinhTrang { get; set; }
        public string TrangThai { get; set; } = string.Empty;
        public decimal TongTien { get; set; }
        public DateTime NgayTiepNhan { get; set; }
        public int? MaKTV { get; set; }
        public string? TenKTV { get; set; }
        public int TongSoHangMuc { get; set; }
        public int SoHangMucHoanThanh { get; set; }
    }

    public class KanbanBoardViewModel
    {
        public List<KanbanItem> ChoSua { get; set; } = new List<KanbanItem>();
        public List<KanbanItem> DangSua { get; set; } = new List<KanbanItem>();
        public List<KanbanItem> ChoThanhToan { get; set; } = new List<KanbanItem>();
    }
}
