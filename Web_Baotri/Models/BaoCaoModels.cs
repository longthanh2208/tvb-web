namespace Web_Baotri.Models
{
    public class BaoCaoViewModel
    {
        public decimal DoanhThuHomNay { get; set; }
        public decimal DoanhThuThang { get; set; }
        public int SoXeChoSua { get; set; }
        public int SoXeDangSua { get; set; }
        public int SoXeChoThanhToan { get; set; }
        public int SoXeHoanThanhHomNay { get; set; }
        public List<dynamic> PhuTungCanhBao { get; set; } = new();
        public List<dynamic> PhieuSuaMoiNhat { get; set; } = new();
    }
}
