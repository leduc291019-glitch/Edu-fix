const UPLOAD_SERVICE = {
    backendUrl: 'http://localhost:5000/api/upload',

    async uploadFileToServer(file) {
        try {
            const formData = new FormData();
            // Đã sửa 'document' thành 'file' để khớp chuẩn thông thường
            formData.append('file', file);

            const response = await fetch(this.backendUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Lỗi xảy ra trong quá trình upload lên server.');
            }

            const data = await response.json();
            if (data.success) {
                return data;
            }

            throw new Error(data.message || 'Server từ chối file.');

        } catch (error) {
            console.error('❌ [Upload Error]:', error);
            alert(`Tải file thất bại: ${error.message}`);
            return null;
        }
    }
};