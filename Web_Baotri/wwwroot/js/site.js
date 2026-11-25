// JavaScript for Web_Baotri - Module 2 Tiếp Nhận Xe & Điều Phối Xưởng

// Biến lưu trữ tạm
let cachedCatalog = { phuTung: [], dichVu: [] };
let cachedKTVs = [];
let selectedItems = []; // Hạng mục dịch vụ/phụ tùng được chọn khi tiếp nhận
let currentMaPhieuModal = 0;
let draggedTicketData = null;

// 1. Cập nhật đếm ký tự 0/500
function updateCharCounter(el) {
    const len = el.value.length;
    document.getElementById('lblCharCount').innerText = `${len}/500`;
}

// 2. Focus ô biển số khi bấm "+ Thêm xe"
function focusBienSoInput() {
    const input = document.getElementById('txtBienSo');
    if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// 3. Thông báo Toast
function showToast(message, isSuccess = true) {
    const toastEl = document.getElementById('appToast');
    const toastMsg = document.getElementById('toastMessage');
    if (toastMsg) toastMsg.innerText = message;
    if (toastEl) {
        toastEl.className = `toast align-items-center text-white border-0 rounded-3 shadow ${isSuccess ? 'bg-primary' : 'bg-danger'}`;
        const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
        toast.show();
    }
}

// Định dạng biển số xe máy Việt Nam (Ví dụ: 60B1-123.45, 49B1-678.90, 49AD-12212, 59A1-1234)
const BIEN_SO_REGEX = /^[0-9]{2}[A-Z]{1}[0-9A-Z]{1,2}-(([0-9]{3}\.[0-9]{2})|([0-9]{2}\.[0-9]{2})|([0-9]{4,5}))$/i;

function validateBienSo(val) {
    if (!val) return "Vui lòng nhập biển số xe!";
    if (!BIEN_SO_REGEX.test(val)) {
        return "Biển số xe không đúng định dạng! Ví dụ đúng: 60B1-123.45 hoặc 49AD-12212";
    }
    return "";
}

function validateSoDienThoai(val) {
    if (!val) return "Vui lòng nhập số điện thoại!";
    if (!/^[0-9]+$/.test(val)) return "Số điện thoại chỉ được chứa các chữ số, không được chứa chữ!";
    if (val.length > 10) return "Số điện thoại không được vượt quá 10 số!";
    if (val.length < 10 || !val.startsWith('0')) return "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0 (ví dụ: 0987654321)!";
    return "";
}

function setFieldError(inputId, valId, message) {
    const input = document.getElementById(inputId);
    const valEl = document.getElementById(valId);
    if (input) input.classList.add('is-invalid');
    if (valEl) {
        valEl.innerText = message;
        valEl.classList.remove('d-none');
    }
}

function clearFieldError(inputId, valId) {
    const input = document.getElementById(inputId);
    const valEl = document.getElementById(valId);
    if (input) input.classList.remove('is-invalid');
    if (valEl) {
        valEl.innerText = '';
        valEl.classList.add('d-none');
    }
}

function clearAllErrors() {
    clearFieldError('txtBienSo', 'valBienSo');
    clearFieldError('txtTenKhach', 'valTenKhach');
    clearFieldError('txtSoDienThoai', 'valSoDienThoai');
}

// 4. Tra cứu thông tin xe & khách hàng tự động khi nhập biển số
function traCuuBienSoClick() {
    clearFieldError('txtBienSo', 'valBienSo');
    const bienSo = document.getElementById('txtBienSo').value.trim().toUpperCase();
    if (!bienSo) {
        setFieldError('txtBienSo', 'valBienSo', "Vui lòng nhập biển số xe để tra cứu!");
        showToast("Vui lòng nhập biển số xe để tra cứu!", false);
        document.getElementById('txtBienSo').focus();
        return;
    }

    const err = validateBienSo(bienSo);
    if (err) {
        setFieldError('txtBienSo', 'valBienSo', err);
        showToast(err, false);
        document.getElementById('txtBienSo').focus();
        return;
    }

    const hintEl = document.getElementById('hintTraCuu');
    hintEl.innerHTML = '<span class="text-primary"><span class="spinner-border spinner-border-sm me-1"></span>Đang tra cứu...</span>';

    fetch(`/Home/TraCuu?bienSo=${encodeURIComponent(bienSo)}`)
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) {
                const d = res.data;
                if (d.tonTai) {
                    document.getElementById('txtTenKhach').value = d.tenKhachHang || '';
                    document.getElementById('txtSoDienThoai').value = d.soDienThoai || '';
                    if (d.dongXe) document.getElementById('txtDongXe').value = d.dongXe;
                    if (d.soODOHienTai) document.getElementById('txtSoODO').value = d.soODOHienTai;

                    clearAllErrors();
                    hintEl.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Tìm thấy: ${d.dongXe || 'Xe máy'} - ${d.tenKhachHang} (ODO: ${(d.soODOHienTai || 0).toLocaleString()} km)</span>`;
                    showToast(`Tìm thấy hồ sơ xe [${d.bienSo}] của khách ${d.tenKhachHang}!`);
                } else {
                    hintEl.innerHTML = `<span class="text-muted"><i class="bi bi-info-circle me-1"></i>Xe mới, vui lòng tạo hồ sơ Khách hàng + Xe máy trên màn hình này</span>`;
                }
            } else {
                hintEl.innerHTML = `<span class="text-muted">${res.message || 'Chưa có thông tin xe này'}</span>`;
            }
        })
        .catch(err => {
            hintEl.innerHTML = `<span class="text-danger">Lỗi kết nối tra cứu</span>`;
        });
}

// 5. Quản lý Catalog Dịch vụ & Phụ tùng trong form tiếp nhận
function loadCatalog() {
    fetch('/Home/GetCatalog')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                cachedCatalog.phuTung = res.phuTung || [];
                cachedCatalog.dichVu = res.dichVu || [];
                populateHangMucDropdown('DichVu');
            }
        })
        .catch(err => console.error("Lỗi nạp catalog:", err));
}

function onLoaiMucChange() {
    const loai = document.getElementById('selLoaiMuc').value;
    populateHangMucDropdown(loai);
}

function populateHangMucDropdown(loai) {
    const sel = document.getElementById('selHangMuc');
    if (!sel) return;

    if (loai === 'DichVu') {
        sel.innerHTML = '<option value="">-- Chọn dịch vụ --</option>' +
            cachedCatalog.dichVu.map(dv => {
                const ma = dv.MaDV || dv.maDV || '';
                const ten = dv.TenDV || dv.tenDV || '';
                const gia = dv.DonGia ?? dv.donGia ?? 0;
                return `<option value="${ma}" data-loai="DichVu" data-ten="${escapeHtml(ten)}" data-gia="${gia}">${escapeHtml(ten)} (${Number(gia).toLocaleString()} đ)</option>`;
            }).join('');
    } else {
        sel.innerHTML = '<option value="">-- Chọn phụ tùng --</option>' +
            cachedCatalog.phuTung.map(pt => {
                const ma = pt.MaPT || pt.maPT || '';
                const ten = pt.TenPT || pt.tenPT || '';
                const gia = pt.GiaBan ?? pt.giaBan ?? 0;
                const ton = pt.SoLuongTon ?? pt.soLuongTon ?? 0;
                return `<option value="${ma}" data-loai="PhuTung" data-ten="${escapeHtml(ten)}" data-gia="${gia}" data-ton="${ton}">${escapeHtml(ten)} - Tồn: ${ton} (${Number(gia).toLocaleString()} đ)</option>`;
            }).join('');
    }
}

function addSelectedHangMuc() {
    const sel = document.getElementById('selHangMuc');
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
        showToast("Vui lòng chọn dịch vụ hoặc phụ tùng!", false);
        return;
    }

    const loai = opt.getAttribute('data-loai') || 'DichVu';
    const ma = opt.value;
    const ten = opt.getAttribute('data-ten');
    const gia = parseFloat(opt.getAttribute('data-gia')) || 0;
    const soLuong = parseInt(document.getElementById('numSoLuong').value) || 1;

    if (soLuong <= 0) {
        showToast("Số lượng phải lớn hơn 0!", false);
        return;
    }

    // Kiểm tra xem đã có trong danh sách chưa -> nếu có thì cộng dồn số lượng
    const existing = selectedItems.find(x => x.loaiMuc === loai && x.maHangMuc === ma);
    if (existing) {
        existing.soLuong += soLuong;
    } else {
        selectedItems.push({
            loaiMuc: loai,
            maHangMuc: ma,
            tenHangMuc: ten,
            soLuong: soLuong,
            donGia: gia
        });
    }

    renderSelectedItems();
    // Reset số lượng về 1
    document.getElementById('numSoLuong').value = 1;
}

function removeSelectedItem(index) {
    if (index >= 0 && index < selectedItems.length) {
        selectedItems.splice(index, 1);
        renderSelectedItems();
    }
}

function renderSelectedItems() {
    const container = document.getElementById('listSelectedItems');
    const emptyNotice = document.getElementById('emptyItemsNotice');
    const countBadge = document.getElementById('lblCountItems');
    const lblTong = document.getElementById('lblTongTamTinh');

    if (!container) return;

    if (selectedItems.length === 0) {
        container.classList.add('d-none');
        container.innerHTML = '';
        if (emptyNotice) emptyNotice.classList.remove('d-none');
        if (countBadge) countBadge.innerText = '0 mục';
        if (lblTong) lblTong.innerText = '0 đ';
        return;
    }

    if (emptyNotice) emptyNotice.classList.add('d-none');
    container.classList.remove('d-none');

    let total = 0;
    container.innerHTML = selectedItems.map((item, idx) => {
        const thanhTien = item.soLuong * item.donGia;
        total += thanhTien;
        const badgeColor = item.loaiMuc === 'PhuTung' ? 'bg-info-subtle text-info-emphasis' : 'bg-primary-subtle text-primary';
        const badgeText = item.loaiMuc === 'PhuTung' ? 'Phụ tùng' : 'Dịch vụ';

        return `
            <li class="list-group-item d-flex align-items-center justify-content-between py-1 px-2 border-0 bg-transparent">
                <div class="d-flex align-items-center gap-2 text-truncate" style="max-width: 70%;">
                    <span class="badge ${badgeColor} fs-9 px-1">${badgeText}</span>
                    <span class="text-truncate fw-semibold" title="${escapeHtml(item.tenHangMuc)}">${escapeHtml(item.tenHangMuc)}</span>
                    <span class="text-muted">x${item.soLuong}</span>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-dark">${thanhTien.toLocaleString()} đ</span>
                    <button type="button" class="btn btn-sm btn-link text-danger p-0" onclick="removeSelectedItem(${idx})" title="Xóa">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </li>
        `;
    }).join('');

    if (countBadge) countBadge.innerText = `${selectedItems.length} mục`;
    if (lblTong) lblTong.innerText = `${total.toLocaleString()} đ`;
}

// 6. Gửi tiếp nhận xe mới
function submitTiepNhanXe() {
    clearAllErrors();

    const bienSo = document.getElementById('txtBienSo').value.trim().toUpperCase();
    const tenKhach = document.getElementById('txtTenKhach').value.trim();
    const soDienThoai = document.getElementById('txtSoDienThoai').value.trim();
    const dongXe = document.getElementById('txtDongXe').value.trim() || 'Xe máy';
    const soODO = parseInt(document.getElementById('txtSoODO').value) || 0;
    const ghiChu = document.getElementById('txtGhiChu').value.trim();

    // 1. Rào lỗi Biển số xe: đúng form
    const errBienSo = validateBienSo(bienSo);
    if (errBienSo) {
        setFieldError('txtBienSo', 'valBienSo', errBienSo);
        showToast(errBienSo, false);
        document.getElementById('txtBienSo').focus();
        return;
    }

    // 2. Rào lỗi Tên khách hàng
    if (!tenKhach || tenKhach.length < 2) {
        const errMsg = "Vui lòng nhập tên khách hàng hợp lệ (từ 2 ký tự)!";
        setFieldError('txtTenKhach', 'valTenKhach', errMsg);
        showToast(errMsg, false);
        document.getElementById('txtTenKhach').focus();
        return;
    }

    // 3. Rào lỗi Số điện thoại: không được là chữ, không quá 10 số, bắt đầu bằng 0
    const errSDT = validateSoDienThoai(soDienThoai);
    if (errSDT) {
        setFieldError('txtSoDienThoai', 'valSoDienThoai', errSDT);
        showToast(errSDT, false);
        document.getElementById('txtSoDienThoai').focus();
        return;
    }

    const btnSubmit = document.getElementById('btnSubmitTiepNhan');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';

    const payload = {
        bienSo: bienSo,
        tenKhach: tenKhach,
        soDienThoai: soDienThoai,
        dongXe: dongXe,
        soODOLucNhan: soODO,
        ghiChuTinhTrang: ghiChu,
        hangMucChon: selectedItems
    };

    fetch('/Home/TiepNhanXe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(res => {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;

        if (res.success) {
            showToast(`Tiếp nhận thành công xe [${bienSo}]! Mã phiếu: #${res.maPhieu} (Tổng: ${(res.tongTien || 0).toLocaleString()} đ)`);
            resetFormTiepNhan();
            refreshKanbanBoard();
        } else {
            showToast(res.message || "Không thể tiếp nhận xe!", false);
        }
    })
    .catch(err => {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
        showToast("Lỗi gửi dữ liệu tiếp nhận: " + err, false);
    });
}

// 7. Nhập lại form tiếp nhận
function resetFormTiepNhan() {
    clearAllErrors();
    document.getElementById('txtBienSo').value = '';
    document.getElementById('txtTenKhach').value = '';
    document.getElementById('txtSoDienThoai').value = '';
    document.getElementById('txtDongXe').value = '';
    document.getElementById('txtSoODO').value = '';
    document.getElementById('txtGhiChu').value = '';
    document.getElementById('lblCharCount').innerText = '0/500';
    document.getElementById('hintTraCuu').innerHTML = '';
    selectedItems = [];
    renderSelectedItems();
    document.getElementById('txtBienSo').focus();
}

// 8. Kỹ thuật viên (KTV) List Loader
function loadKTVList(callback) {
    fetch('/Home/GetKTVList')
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                cachedKTVs = res.data || [];
                const sel = document.getElementById('selAssignKTV');
                if (sel) {
                    sel.innerHTML = '<option value="">-- Chọn kỹ thuật viên --</option>' +
                        cachedKTVs.map(k => {
                            const ma = k.MaTK ?? k.maTK;
                            const ten = k.HoTen || k.hoTen || '';
                            const soXe = k.SoXeDangLam ?? k.soXeDangLam ?? 0;
                            return `<option value="${ma}">${escapeHtml(ten)} (${soXe} xe đang sửa)</option>`;
                        }).join('');
                }
                if (callback) callback();
            }
        })
        .catch(err => console.error("Lỗi nạp KTV:", err));
}

let currentTrangThaiModal = '';

// 9. Mở Modal chi tiết phiếu
function openPhieuModal(maPhieu, bienSo, tenKhach, sdt, dongXe, ghiChu, trangThai, tenKtv, tongTien, soODO) {
    currentMaPhieuModal = maPhieu;
    currentTrangThaiModal = trangThai;
    document.getElementById('mDetailMaPhieu').value = maPhieu;
    document.getElementById('mDetailTitle').innerText = `Phiếu sửa chữa #${maPhieu}`;
    document.getElementById('mDetailBienSo').innerText = bienSo || '-';
    document.getElementById('mDetailDongXe').innerText = dongXe || 'Xe máy';
    document.getElementById('mDetailODO').innerText = soODO ? `${Number(soODO).toLocaleString()} km` : '0 km';
    document.getElementById('mDetailTenKhach').innerText = tenKhach || '-';
    document.getElementById('mDetailSDT').innerText = sdt || '-';
    document.getElementById('mDetailGhiChu').innerText = ghiChu || 'Không có ghi chú tình trạng';
    document.getElementById('lblDetailTongTien').innerText = tongTien ? `${Number(tongTien).toLocaleString()} đ` : '0 đ';

    const ktvEl = document.getElementById('mDetailKTVText');
    if (ktvEl) {
        ktvEl.innerText = tenKtv ? `🔧 ${tenKtv}` : 'Chưa giao thợ';
        ktvEl.className = tenKtv ? 'badge bg-warning text-dark fs-8' : 'badge bg-secondary-subtle text-secondary fs-8';
    }

    const badgeEl = document.getElementById('mDetailTrangThaiBadge');
    if (trangThai === 'ChoSua') {
        badgeEl.className = 'badge bg-primary-subtle text-primary mb-1';
        badgeEl.innerText = '● Chờ sửa (Mới tiếp nhận)';
    } else if (trangThai === 'DangSua') {
        badgeEl.className = 'badge bg-warning-subtle text-warning mb-1';
        badgeEl.innerText = '● Đang sửa chữa';
    } else if (trangThai === 'ChoThanhToan') {
        badgeEl.className = 'badge bg-info-subtle text-info mb-1';
        badgeEl.innerText = '● Chờ thanh toán';
    } else {
        badgeEl.className = 'badge bg-success-subtle text-success mb-1';
        badgeEl.innerText = '✔ Đã thanh toán';
    }

    updateActiveStatusButton(trangThai);

    // Hiển thị / ẩn khu vực sửa và thêm hạng mục tùy theo trạng thái
    const boxAdd = document.getElementById('boxAddHangMucToPhieu');
    const hintEdit = document.getElementById('lblItemEditHint');
    const thAction = document.getElementById('thActionHeader');

    if (trangThai === 'DaThanhToan') {
        if (boxAdd) boxAdd.classList.add('d-none');
        if (hintEdit) hintEdit.classList.add('d-none');
        if (thAction) thAction.classList.add('d-none');
    } else {
        if (boxAdd) boxAdd.classList.remove('d-none');
        if (hintEdit) hintEdit.classList.remove('d-none');
        if (thAction) thAction.classList.remove('d-none');
        populateModalHangMucDropdown('DichVu');
    }

    // Hiển thị/ẩn hoặc làm nổi bật nút chốt hóa đơn
    const btnChot = document.getElementById('btnChotThanhToanModal');
    if (btnChot) {
        if (trangThai === 'ChoThanhToan') {
            btnChot.className = 'btn btn-sm btn-success rounded-pill px-3 fw-bold shadow-sm';
            btnChot.style.display = 'inline-block';
        } else {
            btnChot.className = 'btn btn-sm btn-outline-success rounded-pill px-3';
            btnChot.style.display = 'inline-block';
        }
    }

    // Tải chi tiết các hạng mục phụ tùng & dịch vụ trong phiếu
    loadChiTietPhieu(maPhieu, trangThai);

    // Nạp danh sách KTV vào dropdown phân công
    loadKTVList();

    const modal = new bootstrap.Modal(document.getElementById('modalPhieuDetail'));
    modal.show();
}

function updateActiveStatusButton(trangThai) {
    const btnChoSua = document.getElementById('btnStatusChoSua');
    const btnDangSua = document.getElementById('btnStatusDangSua');
    const btnChoThanhToan = document.getElementById('btnStatusChoThanhToan');

    if (btnChoSua) btnChoSua.className = 'btn btn-sm rounded-pill px-3 ' + (trangThai === 'ChoSua' ? 'btn-primary text-white shadow-sm' : 'btn-outline-primary');
    if (btnDangSua) btnDangSua.className = 'btn btn-sm rounded-pill px-3 ' + (trangThai === 'DangSua' ? 'btn-warning text-dark shadow-sm' : 'btn-outline-warning');
    if (btnChoThanhToan) btnChoThanhToan.className = 'btn btn-sm rounded-pill px-3 ' + (trangThai === 'ChoThanhToan' ? 'btn-info text-dark shadow-sm' : 'btn-outline-info');
}

// 10. Tải chi tiết bảng phụ tùng & dịch vụ của phiếu (kèm nút sửa số lượng và xóa)
function loadChiTietPhieu(maPhieu, trangThai = currentTrangThaiModal) {
    const tbody = document.getElementById('tblDetailPhieuItems');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-2">Đang tải chi tiết...</td></tr>';

    const canEdit = (trangThai !== 'DaThanhToan');

    fetch(`/Home/GetChiTietPhieu?maPhieu=${maPhieu}`)
        .then(res => res.json())
        .then(res => {
            if (res.success && res.chiTiet && res.chiTiet.length > 0) {
                tbody.innerHTML = res.chiTiet.map((item, idx) => {
                    const maCT = item.MaCT ?? item.maCT;
                    const loai = item.LoaiMuc || item.loaiMuc || '';
                    const ten = item.TenHangMuc || item.tenHangMuc || '';
                    const dvt = item.DonViTinh || item.donViTinh || (loai === 'PhuTung' ? 'Cái' : 'Lần');
                    const sl = item.SoLuong ?? item.soLuong ?? 1;
                    const gia = item.DonGiaLucBan ?? item.donGiaLucBan ?? 0;
                    const thanhTien = item.ThanhTien ?? item.thanhTien ?? (sl * gia);

                    const slCell = canEdit ? `
                        <div class="d-flex align-items-center justify-content-center gap-1">
                            <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2 fs-8" onclick="changeItemQty(${maCT}, ${sl - 1})">-</button>
                            <span class="fw-bold px-1">${sl}</span>
                            <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2 fs-8" onclick="changeItemQty(${maCT}, ${sl + 1})">+</button>
                        </div>
                    ` : `<span class="fw-bold">${sl}</span>`;

                    const actionCell = canEdit ? `
                        <td class="text-center">
                            <button type="button" class="btn btn-sm btn-link text-danger p-0" onclick="deleteItemFromPhieu(${maCT}, '${escapeHtml(ten)}')" title="Xóa hạng mục">
                                <i class="bi bi-trash3 fs-7"></i>
                            </button>
                        </td>
                    ` : '<td class="text-center text-muted">-</td>';

                    return `
                        <tr>
                            <td class="text-center">${idx + 1}</td>
                            <td>
                                <span class="badge ${loai === 'PhuTung' ? 'bg-info-subtle text-info-emphasis' : 'bg-primary-subtle text-primary'}">
                                    ${loai === 'PhuTung' ? 'Phụ tùng' : 'Dịch vụ'}
                                </span>
                            </td>
                            <td class="fw-semibold">${escapeHtml(ten)}</td>
                            <td class="text-center">${escapeHtml(dvt)}</td>
                            <td class="text-center">${slCell}</td>
                            <td class="text-end">${Number(gia).toLocaleString()} đ</td>
                            <td class="text-end fw-bold text-dark">${Number(thanhTien).toLocaleString()} đ</td>
                            ${actionCell}
                        </tr>
                    `;
                }).join('');

                const phieu = res.phieu;
                const tong = phieu ? (phieu.TongTien ?? phieu.tongTien ?? 0) : 0;
                document.getElementById('lblDetailTongTien').innerText = `${Number(tong).toLocaleString()} đ`;
            } else {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3 fst-italic">Phiếu chưa có hạng mục phụ tùng hoặc dịch vụ nào</td></tr>';
                document.getElementById('lblDetailTongTien').innerText = '0 đ';
            }
        })
        .catch(err => {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-2">Lỗi nạp chi tiết phiếu</td></tr>';
        });
}

// 10.1 Quản lý dropdown thêm hạng mục trong Modal
function onModalLoaiMucChange() {
    const loai = document.getElementById('selModalLoaiMuc').value;
    populateModalHangMucDropdown(loai);
}

function populateModalHangMucDropdown(loai) {
    const sel = document.getElementById('selModalHangMuc');
    if (!sel) return;

    if (loai === 'DichVu') {
        sel.innerHTML = '<option value="">-- Chọn dịch vụ --</option>' +
            cachedCatalog.dichVu.map(dv => {
                const ma = dv.MaDV || dv.maDV || '';
                const ten = dv.TenDV || dv.tenDV || '';
                const gia = dv.DonGia ?? dv.donGia ?? 0;
                return `<option value="${ma}">${escapeHtml(ten)} (${Number(gia).toLocaleString()} đ)</option>`;
            }).join('');
    } else {
        sel.innerHTML = '<option value="">-- Chọn phụ tùng --</option>' +
            cachedCatalog.phuTung.map(pt => {
                const ma = pt.MaPT || pt.maPT || '';
                const ten = pt.TenPT || pt.tenPT || '';
                const gia = pt.GiaBan ?? pt.giaBan ?? 0;
                const ton = pt.SoLuongTon ?? pt.soLuongTon ?? 0;
                return `<option value="${ma}">${escapeHtml(ten)} - Tồn: ${ton} (${Number(gia).toLocaleString()} đ)</option>`;
            }).join('');
    }
}

// 10.2 Thêm hạng mục trực tiếp vào phiếu đang sửa hoặc chờ thanh toán
function submitThemHangMucToPhieu() {
    const maPhieu = parseInt(document.getElementById('mDetailMaPhieu').value);
    const loaiMuc = document.getElementById('selModalLoaiMuc').value;
    const maHangMuc = document.getElementById('selModalHangMuc').value;
    const soLuong = parseInt(document.getElementById('numModalSoLuong').value) || 1;

    if (!maPhieu) return;
    if (!maHangMuc) {
        showToast("Vui lòng chọn dịch vụ hoặc phụ tùng cần thêm!", false);
        return;
    }
    if (soLuong <= 0) {
        showToast("Số lượng phải lớn hơn 0!", false);
        return;
    }

    fetch('/Home/ThemHangMucPhieu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            maPhieu: maPhieu,
            loaiMuc: loaiMuc,
            maHangMuc: maHangMuc,
            soLuong: soLuong
        })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast(res.message || "Đã thêm hạng mục vào phiếu!");
            document.getElementById('selModalHangMuc').value = '';
            document.getElementById('numModalSoLuong').value = 1;
            loadChiTietPhieu(maPhieu, currentTrangThaiModal);
            refreshKanbanBoard();
        } else {
            showToast(res.message || "Không thể thêm hạng mục!", false);
        }
    })
    .catch(err => {
        showToast("Lỗi thêm hạng mục: " + err, false);
    });
}

// 10.3 Thay đổi số lượng hạng mục trong phiếu
function changeItemQty(maCT, newQty) {
    if (newQty <= 0) {
        deleteItemFromPhieu(maCT);
        return;
    }

    fetch('/Home/CapNhatSoLuongHangMuc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maCT: maCT, soLuongMoi: newQty })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast("Đã cập nhật số lượng thành công!");
            loadChiTietPhieu(currentMaPhieuModal, currentTrangThaiModal);
            refreshKanbanBoard();
        } else {
            showToast(res.message || "Không thể cập nhật số lượng!", false);
        }
    })
    .catch(err => {
        showToast("Lỗi kết nối cập nhật số lượng: " + err, false);
    });
}

// 10.4 Xóa hạng mục khỏi phiếu
function deleteItemFromPhieu(maCT, tenHangMuc = 'này') {
    if (!confirm(`Xác nhận xóa hạng mục [${tenHangMuc}] khỏi phiếu?`)) {
        return;
    }

    fetch('/Home/XoaHangMucPhieu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maCT: maCT })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast(res.message || "Đã xóa hạng mục khỏi phiếu!");
            loadChiTietPhieu(currentMaPhieuModal, currentTrangThaiModal);
            refreshKanbanBoard();
        } else {
            showToast(res.message || "Không thể xóa hạng mục!", false);
        }
    })
    .catch(err => {
        showToast("Lỗi kết nối xóa hạng mục: " + err, false);
    });
}

// 11. Chuyển trạng thái phiếu từ Modal
function chuyenTrangThaiCurrent(trangThaiMoi) {
    const maPhieu = parseInt(document.getElementById('mDetailMaPhieu').value);
    if (!maPhieu) return;

    fetch('/Home/ChuyenTrangThai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maPhieu: maPhieu, trangThaiMoi: trangThaiMoi })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast("Đã cập nhật trạng thái phiếu thành công!");
            bootstrap.Modal.getInstance(document.getElementById('modalPhieuDetail'))?.hide();
            refreshKanbanBoard();
        } else {
            showToast(res.message || "Lỗi chuyển trạng thái", false);
        }
    })
    .catch(err => {
        showToast("Lỗi kết nối: " + err, false);
    });
}

// 12. Phân công Kỹ thuật viên (KTV)
function submitPhanCongKTV() {
    const maPhieu = parseInt(document.getElementById('mDetailMaPhieu').value);
    const selKTV = document.getElementById('selAssignKTV');
    const maKTV = parseInt(selKTV.value);

    if (!maPhieu) return;
    if (!maKTV) {
        showToast("Vui lòng chọn Kỹ thuật viên để phân công!", false);
        return;
    }

    fetch('/Home/PhanCongKTV', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maPhieu: maPhieu, maKTV: maKTV })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast(res.message || "Phân công kỹ thuật viên thành công!");
            bootstrap.Modal.getInstance(document.getElementById('modalPhieuDetail'))?.hide();
            refreshKanbanBoard();
        } else {
            showToast(res.message || "Không thể phân công KTV!", false);
        }
    })
    .catch(err => {
        showToast("Lỗi kết nối phân công KTV: " + err, false);
    });
}

// 13. Chốt hóa đơn & Thanh toán (Trừ kho phụ tùng, cập nhật ODO, chuyển DaThanhToan)
function submitChotHoaDonCurrent() {
    const maPhieu = parseInt(document.getElementById('mDetailMaPhieu').value);
    if (!maPhieu) return;

    if (!confirm(`Xác nhận chốt hóa đơn và thanh toán cho Phiếu #${maPhieu}?\nHệ thống sẽ tự động trừ tồn kho phụ tùng và cập nhật hồ sơ bảo dưỡng xe.`)) {
        return;
    }

    fetch('/Home/ChotHoaDon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maPhieu: maPhieu })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast("Thanh toán thành công! Đã trừ kho phụ tùng và cập nhật hồ sơ xe.");
            bootstrap.Modal.getInstance(document.getElementById('modalPhieuDetail'))?.hide();
            refreshKanbanBoard();
            // Mở hóa đơn in
            setTimeout(() => {
                openInHoaDonModal(maPhieu);
            }, 400);
        } else {
            showToast(res.message || "Không thể chốt hóa đơn thanh toán!", false);
        }
    })
    .catch(err => {
        showToast("Lỗi thanh toán: " + err, false);
    });
}

// 14. Mở Modal In / Xem Hóa Đơn hoàn chỉnh
function openInHoaDonModalCurrent() {
    const maPhieu = parseInt(document.getElementById('mDetailMaPhieu').value);
    if (maPhieu) {
        bootstrap.Modal.getInstance(document.getElementById('modalPhieuDetail'))?.hide();
        setTimeout(() => {
            openInHoaDonModal(maPhieu);
        }, 300);
    }
}

function openInHoaDonModal(maPhieu) {
    fetch(`/Home/GetInHoaDon?maPhieu=${maPhieu}`)
        .then(res => res.json())
        .then(res => {
            if (res.success && res.hoaDon) {
                const hd = res.hoaDon;
                const soHD = hd.SoHoaDon ?? hd.soHoaDon ?? maPhieu;
                const tenTT = hd.TenTrungTam || hd.tenTrungTam || 'TRUNG TÂM BẢO DƯỠNG XE MÁY TVB';
                const diaChiTT = hd.DiaChiTrungTam || hd.diaChiTrungTam || 'Lâm Đồng - Hotline: 0901.234.567';
                const ngayTT = hd.NgayThanhToan || hd.ngayThanhToan;
                const tenKhach = hd.TenKhachHang || hd.tenKhachHang || '-';
                const sdt = hd.SoDienThoai || hd.soDienThoai || '-';
                const bienSo = hd.BienSo || hd.bienSo || '-';
                const dongXe = hd.DongXe || hd.dongXe || 'Xe máy';
                const odo = hd.SoODOLucNhan ?? hd.soODOLucNhan ?? 0;
                const tenKTV = hd.TenKyThuatVien || hd.tenKyThuatVien || hd.TenKTV || hd.tenKTV || 'Không chỉ định';
                const ghiChu = hd.GhiChuTinhTrang || hd.ghiChuTinhTrang || 'Không có';
                const tongTien = hd.TongTien ?? hd.tongTien ?? 0;

                document.getElementById('invSoHoaDon').innerText = `#${soHD}`;
                document.getElementById('invTenTrungTam').innerText = tenTT;
                document.getElementById('invDiaChiTrungTam').innerText = diaChiTT;
                document.getElementById('invNgayThanhToan').innerText = ngayTT ? new Date(ngayTT).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
                document.getElementById('invTenKhach').innerText = tenKhach;
                document.getElementById('invSDT').innerText = sdt;
                document.getElementById('invBienSo').innerText = bienSo;
                document.getElementById('invDongXe').innerText = dongXe;
                document.getElementById('invODO').innerText = odo ? Number(odo).toLocaleString() : '0';
                document.getElementById('invKTV').innerText = tenKTV;
                document.getElementById('invGhiChu').innerText = ghiChu;
                document.getElementById('invTongTien').innerText = `${Number(tongTien).toLocaleString()} đ`;

                const tbody = document.getElementById('invTbodyItems');
                if (res.chiTiet && res.chiTiet.length > 0) {
                    tbody.innerHTML = res.chiTiet.map((item, idx) => {
                        const stt = item.STT ?? item.stt ?? (idx + 1);
                        const ten = item.TenHangMuc || item.tenHangMuc || '';
                        const dvt = item.DonViTinh || item.donViTinh || '';
                        const sl = item.SoLuong ?? item.soLuong ?? 1;
                        const gia = item.DonGiaLucBan ?? item.donGiaLucBan ?? 0;
                        const thanhTien = item.ThanhTien ?? item.thanhTien ?? (sl * gia);

                        return `
                            <tr>
                                <td class="text-center">${stt}</td>
                                <td>${escapeHtml(ten)}</td>
                                <td class="text-center">${escapeHtml(dvt)}</td>
                                <td class="text-center">${sl}</td>
                                <td class="text-end">${Number(gia).toLocaleString()} đ</td>
                                <td class="text-end fw-bold">${Number(thanhTien).toLocaleString()} đ</td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-2 text-muted">Không có chi tiết hạng mục</td></tr>';
                }

                const modal = new bootstrap.Modal(document.getElementById('modalInHoaDon'));
                modal.show();
            } else {
                showToast(res.message || "Không thể lấy thông tin in hóa đơn!", false);
            }
        })
        .catch(err => {
            showToast("Lỗi lấy thông tin hóa đơn: " + err, false);
        });
}

// 15. Kéo thả (Drag & Drop) giữa 3 cột Kanban
function onCardDragStart(e, maPhieu, currentTrangThai) {
    draggedTicketData = { maPhieu: maPhieu, currentTrangThai: currentTrangThai };
    e.dataTransfer.setData('text/plain', JSON.stringify(draggedTicketData));
    e.currentTarget.classList.add('dragging');
}

function onCardDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.kanban-column-wrapper').forEach(col => {
        col.classList.remove('drag-over-active');
    });
}

function onColDragOver(e) {
    e.preventDefault();
    const col = e.currentTarget;
    col.classList.add('drag-over-active');
}

function onColDragLeave(e) {
    e.currentTarget.classList.remove('drag-over-active');
}

function onColDrop(e, targetColStatus) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over-active');

    try {
        const dataStr = e.dataTransfer.getData('text/plain');
        const data = JSON.parse(dataStr);
        if (!data || !data.maPhieu) return;

        if (data.currentTrangThai === targetColStatus) {
            return; // Kéo trong cùng 1 cột
        }

        // Nếu kéo vào cột Đang sửa -> mở modal để chọn KTV
        if (targetColStatus === 'DangSua') {
            fetch(`/Home/GetChiTietPhieu?maPhieu=${data.maPhieu}`)
                .then(res => res.json())
                .then(res => {
                    if (res.success && res.phieu) {
                        const p = res.phieu;
                        openPhieuModal(p.maPhieu, p.bienSo, p.tenKhachHang, p.soDienThoai, p.dongXe, p.ghiChuTinhTrang, p.trangThai, p.tenKTV, p.tongTien, p.soODOLucNhan);
                        showToast("Vui lòng phân công Kỹ thuật viên để chuyển sang Đang sửa!", false);
                    }
                });
            return;
        }

        // Chuyển trạng thái
        fetch('/Home/ChuyenTrangThai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maPhieu: data.maPhieu, trangThaiMoi: targetColStatus })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                showToast(`Đã chuyển phiếu #${data.maPhieu} sang [${targetColStatus}] thành công!`);
                refreshKanbanBoard();
            } else {
                showToast(res.message || "Lỗi chuyển trạng thái", false);
            }
        })
        .catch(err => {
            showToast("Lỗi kết nối chuyển trạng thái: " + err, false);
        });

    } catch (err) {
        console.error("Lỗi drop card:", err);
    }
}

// 16. Nạp lại bảng Kanban qua AJAX (không reload trang)
function refreshKanbanBoard() {
    fetch('/Home/GetBoardData')
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) {
                renderKanbanColumn('colChoSua', res.data.choSua, 'blue', 'Mới tiếp nhận');
                renderKanbanColumn('colDangSua', res.data.dangSua, 'orange', 'Đang sửa chữa');
                renderKanbanColumn('colChoThanhToan', res.data.choThanhToan, 'purple', 'Chờ thanh toán');

                document.getElementById('badgeCountChoSua').innerText = res.data.choSua.length;
                document.getElementById('badgeCountDangSua').innerText = res.data.dangSua.length;
                document.getElementById('badgeCountChoThanhToan').innerText = res.data.choThanhToan.length;
            }
        });
}

function renderKanbanColumn(containerId, items, colorClass, statusLabel) {
    const col = document.getElementById(containerId);
    if (!col) return;

    if (items.length === 0) {
        col.innerHTML = `
            <div class="empty-column-placeholder text-center py-4">
                <i class="bi bi-inbox text-muted opacity-50 fs-2 d-block mb-1"></i>
                <span class="text-muted fs-8">Không có xe</span>
            </div>`;
        return;
    }

    col.innerHTML = items.map(item => `
        <div class="kanban-card" draggable="true"
             ondragstart="onCardDragStart(event, ${item.maPhieu}, '${item.trangThai}')" ondragend="onCardDragEnd(event)"
             onclick="openPhieuModal(${item.maPhieu}, '${escapeHtml(item.bienSo)}', '${escapeHtml(item.tenKhachHang)}', '${escapeHtml(item.soDienThoai)}', '${escapeHtml(item.dongXe || 'Xe máy')}', '${escapeHtml(item.ghiChuTinhTrang || '')}', '${item.trangThai}', '${escapeHtml(item.tenKTV || '')}', ${item.tongTien}, ${item.soODOLucNhan || 0})">
            <div class="card-inner">
                <div class="moto-icon-box ${colorClass}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5m6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5m-6-1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/>
                        <path d="M4.5 9h5a.5.5 0 0 0 0-1h-5a.5.5 0 0 0 0 1m1.5-4a.5.5 0 0 0 0 1h2.5a.5.5 0 0 0 0-1zm1.5-1.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5"/>
                    </svg>
                </div>
                <div class="card-info">
                    <div class="card-plate">${escapeHtml(item.bienSo)}</div>
                    <div class="card-customer">${escapeHtml(item.tenKhachHang)}</div>
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-1 mt-1">
                        <span class="card-status-badge ${colorClass}">${statusLabel}</span>
                        ${item.tongTien > 0 ? `<span class="fs-8 fw-bold text-primary">${Number(item.tongTien).toLocaleString()} đ</span>` : ''}
                    </div>
                    ${item.tenKTV ? `<div class="fs-8 text-secondary mt-1"><i class="bi bi-wrench-adjustable me-1 text-warning"></i>${escapeHtml(item.tenKTV)}</div>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// 17. Quản lý Tài khoản (User Session)
function loadCurrentUser() {
    fetch('/Home/GetCurrentUser')
        .then(res => res.json())
        .then(res => {
            if (res.success && res.user) {
                const u = res.user;
                document.getElementById('navUserHoTen').innerText = u.hoTen || 'Lễ Tân';
                document.getElementById('navUserVaiTro').innerText = u.vaiTro || 'Tiếp nhận';
                document.getElementById('dropUserHoTen').innerText = u.hoTen || 'Lễ Tân';
                document.getElementById('dropUserTenDangNhap').innerText = `@${u.tenDangNhap || 'covan1'}`;

                document.getElementById('profHoTen').innerText = u.hoTen || 'Lễ Tân';
                document.getElementById('profVaiTro').innerText = u.vaiTro || 'Tiếp nhận';
                document.getElementById('profMaTK').innerText = u.maTK || '2';
                document.getElementById('profTenDangNhap').innerText = u.tenDangNhap || 'covan1';
            }
        });
}

function submitLogin() {
    const u = document.getElementById('txtLoginUsername').value.trim();
    const p = document.getElementById('txtLoginPassword').value;
    const err = document.getElementById('loginErrorMsg');
    err.classList.add('d-none');

    if (!u || !p) {
        err.innerText = "Vui lòng nhập tên đăng nhập và mật khẩu!";
        err.classList.remove('d-none');
        return;
    }

    fetch('/Home/Login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenDangNhap: u, matKhau: p })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast("Đăng nhập thành công!");
            bootstrap.Modal.getInstance(document.getElementById('modalLogin'))?.hide();
            loadCurrentUser();
        } else {
            err.innerText = res.message || "Đăng nhập thất bại!";
            err.classList.remove('d-none');
        }
    })
    .catch(e => {
        err.innerText = "Lỗi kết nối: " + e;
        err.classList.remove('d-none');
    });
}

function submitLogout() {
    fetch('/Home/Logout', { method: 'POST' })
        .then(res => res.json())
        .then(res => {
            showToast("Đã đăng xuất tài khoản!");
            loadCurrentUser();
        });
}

function submitChangePassword() {
    const oldP = document.getElementById('txtPassOld').value;
    const newP = document.getElementById('txtPassNew').value;
    const confirmP = document.getElementById('txtPassConfirm').value;
    const err = document.getElementById('changePassErrorMsg');
    err.classList.add('d-none');

    if (!oldP || !newP || !confirmP) {
        err.innerText = "Vui lòng điền đầy đủ các thông tin!";
        err.classList.remove('d-none');
        return;
    }
    if (newP !== confirmP) {
        err.innerText = "Mật khẩu xác nhận không khớp!";
        err.classList.remove('d-none');
        return;
    }

    fetch('/Home/ChangePassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matKhauCu: oldP, matKhauMoi: newP, xacNhanMatKhauMoi: confirmP })
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast("Đổi mật khẩu thành công!");
            bootstrap.Modal.getInstance(document.getElementById('modalDoiMatKhau'))?.hide();
            document.getElementById('txtPassOld').value = '';
            document.getElementById('txtPassNew').value = '';
            document.getElementById('txtPassConfirm').value = '';
        } else {
            err.innerText = res.message || "Không thể đổi mật khẩu!";
            err.classList.remove('d-none');
        }
    })
    .catch(e => {
        err.innerText = "Lỗi kết nối: " + e;
        err.classList.remove('d-none');
    });
}

function loadDanhSachTaiKhoan() {
    fetch('/Home/GetDanhSachTaiKhoan')
        .then(res => res.json())
        .then(res => {
            const tbody = document.getElementById('tblDanhSachTaiKhoanBody');
            if (res.success && res.data) {
                tbody.innerHTML = res.data.map(u => `
                    <tr>
                        <td class="text-center fw-bold">${u.maTK}</td>
                        <td class="text-primary fw-semibold">${escapeHtml(u.tenDangNhap)}</td>
                        <td>${escapeHtml(u.hoTen)}</td>
                        <td><span class="badge ${u.vaiTro === 'Admin' ? 'bg-danger' : (u.vaiTro === 'KyThuatVien' ? 'bg-warning text-dark' : 'bg-primary')}">${escapeHtml(u.vaiTro)}</span></td>
                        <td><span class="badge ${u.trangThai === 1 ? 'bg-success' : 'bg-secondary'}">${u.trangThai === 1 ? 'Hoạt động' : 'Khóa'}</span></td>
                        <td class="text-center">
                            <button type="button" class="btn btn-sm btn-outline-primary py-0 px-2 fs-8" onclick="quickSwitchAccount('${escapeHtml(u.tenDangNhap)}')">
                                Chọn
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        });
}

function quickSwitchAccount(username) {
    bootstrap.Modal.getInstance(document.getElementById('modalDanhSachTaiKhoan'))?.hide();
    document.getElementById('txtLoginUsername').value = username;
    document.getElementById('txtLoginPassword').value = '';
    const loginModal = new bootstrap.Modal(document.getElementById('modalLogin'));
    loginModal.show();
    document.getElementById('txtLoginPassword').focus();
}

function showFeatureAlert(name) {
    showToast(`Chức năng [${name}] đang mở rộng trong phiên bản tiếp theo!`);
}

// 18. DOMContentLoaded Init
document.addEventListener('DOMContentLoaded', function () {
    const inputBienSo = document.getElementById('txtBienSo');
    if (inputBienSo) {
        inputBienSo.addEventListener('input', function () {
            this.value = this.value.toUpperCase().replace(/\s+/g, '-');
            clearFieldError('txtBienSo', 'valBienSo');
        });

        inputBienSo.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                traCuuBienSoClick();
            }
        });

        inputBienSo.addEventListener('blur', function () {
            const val = this.value.trim().toUpperCase();
            if (val.length >= 4) {
                const err = validateBienSo(val);
                if (!err) {
                    traCuuBienSoClick();
                }
            }
        });
    }

    const inputTenKhach = document.getElementById('txtTenKhach');
    if (inputTenKhach) {
        inputTenKhach.addEventListener('input', function () {
            clearFieldError('txtTenKhach', 'valTenKhach');
        });
    }

    const inputSDT = document.getElementById('txtSoDienThoai');
    if (inputSDT) {
        inputSDT.addEventListener('keypress', function (e) {
            if (!/[0-9]/.test(e.key) && e.key !== 'Enter') {
                e.preventDefault();
            }
        });

        inputSDT.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
            clearFieldError('txtSoDienThoai', 'valSoDienThoai');
        });
    }

    // Nạp thông tin tài khoản đang đăng nhập
    loadCurrentUser();

    // Nạp catalog dịch vụ & phụ tùng cho form tiếp nhận
    loadCatalog();

    // Nạp danh sách KTV
    loadKTVList();

    // Kiểm tra URL parameters (ví dụ: chuyển từ tab Khách hàng qua bằng nút "Tiếp nhận ngay")
    const urlParams = new URLSearchParams(window.location.search);
    const pBienSo = urlParams.get('bienSo');
    if (pBienSo && inputBienSo) {
        inputBienSo.value = pBienSo;
        const pTen = urlParams.get('tenKhach');
        const pSdt = urlParams.get('sdt');
        const pDongXe = urlParams.get('dongXe');
        const pOdo = urlParams.get('odo');
        if (pTen && document.getElementById('txtTenKhach')) document.getElementById('txtTenKhach').value = pTen;
        if (pSdt && document.getElementById('txtSoDienThoai')) document.getElementById('txtSoDienThoai').value = pSdt;
        if (pDongXe && document.getElementById('txtDongXe')) document.getElementById('txtDongXe').value = pDongXe;
        if (pOdo && document.getElementById('txtODOHienTai')) document.getElementById('txtODOHienTai').value = pOdo;
        focusBienSoInput();
    }

    // Tải danh sách tài khoản khi mở modalDanhSachTaiKhoan
    const modalDSTK = document.getElementById('modalDanhSachTaiKhoan');
    if (modalDSTK) {
        modalDSTK.addEventListener('show.bs.modal', function () {
            loadDanhSachTaiKhoan();
        });
    }
});

// ==========================================
// THƯ VIỆN PHÂN TRANG BẢNG WEB (10 DÒNG / TRANG)
// ==========================================
class TablePagination {
    constructor(options) {
        this.instanceName = options.instanceName || 'tablePaging';
        this.tableId = options.tableId;
        this.tbodyId = options.tbodyId;
        this.paginationContainerId = options.paginationContainerId;
        this.infoLabelId = options.infoLabelId;
        this.pageSize = options.pageSize || 10;
        this.currentPage = 1;
        this.rows = [];
        this.filteredRows = undefined;
        this.init();
    }

    init() {
        this.updateRows();
        this.render();
    }

    updateRows() {
        const tbody = document.getElementById(this.tbodyId);
        if (!tbody) return;
        this.rows = Array.from(tbody.querySelectorAll('tr')).filter(r => !r.querySelector('td[colspan]'));
    }

    setFilteredRows(matchingRows) {
        this.filteredRows = matchingRows;
        this.currentPage = 1;
        this.render();
    }

    getEffectiveRows() {
        if (this.filteredRows !== undefined) {
            return this.filteredRows;
        }
        return this.rows;
    }

    getTotalPages() {
        const total = this.getEffectiveRows().length;
        return Math.max(1, Math.ceil(total / this.pageSize));
    }

    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        this.currentPage = page;
        this.render();
    }

    render() {
        const effRows = this.getEffectiveRows();
        const totalRows = effRows.length;
        const totalPages = this.getTotalPages();

        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        const startIdx = (this.currentPage - 1) * this.pageSize;
        const endIdx = startIdx + this.pageSize;

        // Ẩn tất cả các dòng master trước
        this.rows.forEach(r => r.style.display = 'none');

        // Chỉ hiển thị các dòng thuộc trang hiện tại
        effRows.forEach((r, idx) => {
            if (idx >= startIdx && idx < endIdx) {
                r.style.display = '';
            } else {
                r.style.display = 'none';
            }
        });

        // Cập nhật nhãn thông tin
        if (this.infoLabelId) {
            const lbl = document.getElementById(this.infoLabelId);
            if (lbl) {
                if (totalRows === 0) {
                    lbl.innerHTML = 'Hiển thị <b class="text-dark">0</b> dữ liệu (10 dòng/trang)';
                } else {
                    const fromNum = startIdx + 1;
                    const toNum = Math.min(endIdx, totalRows);
                    lbl.innerHTML = `Hiển thị <b class="text-primary">${fromNum} - ${toNum}</b> trên tổng <b class="text-dark">${totalRows}</b> dữ liệu (Trang <b>${this.currentPage}/${totalPages}</b> | 10 dòng/trang)`;
                }
            }
        }

        // Render thanh nút phân trang Bootstrap 5 (luôn hiển thị đồng bộ, chuyên nghiệp)
        if (this.paginationContainerId) {
            const container = document.getElementById(this.paginationContainerId);
            if (!container) return;

            let html = `<ul class="pagination pagination-sm m-0 shadow-xs">`;
            
            // Nút Trước
            const isPrevDisabled = this.currentPage <= 1;
            html += `<li class="page-item ${isPrevDisabled ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0)" ${isPrevDisabled ? 'tabindex="-1" aria-disabled="true"' : `onclick="window['${this.instanceName}'].goToPage(${this.currentPage - 1})"`}>
                    <i class="bi bi-chevron-left me-1"></i>Trước
                </a>
            </li>`;

            // Các số trang
            const pagesToRender = Math.max(1, totalPages);
            for (let p = 1; p <= pagesToRender; p++) {
                if (pagesToRender <= 7 || p === 1 || p === pagesToRender || (p >= this.currentPage - 1 && p <= this.currentPage + 1)) {
                    html += `<li class="page-item ${p === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="javascript:void(0)" onclick="window['${this.instanceName}'].goToPage(${p})">${p}</a>
                    </li>`;
                } else if (p === this.currentPage - 2 || p === this.currentPage + 2) {
                    html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }

            // Nút Sau
            const isNextDisabled = this.currentPage >= totalPages;
            html += `<li class="page-item ${isNextDisabled ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0)" ${isNextDisabled ? 'tabindex="-1" aria-disabled="true"' : `onclick="window['${this.instanceName}'].goToPage(${this.currentPage + 1})"`}>
                    Sau<i class="bi bi-chevron-right ms-1"></i>
                </a>
            </li>`;

            html += `</ul>`;
            container.innerHTML = html;
        }
    }
}
window.TablePagination = TablePagination;
