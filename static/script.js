// Handle file upload feedback
document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('file');
    const fileLabel = document.getElementById('file-label');

    if (fileInput && fileLabel) {
        fileInput.addEventListener('change', function () {
            const fileName = fileInput.files.length ? fileInput.files[0].name : "Choose a file";
            fileLabel.innerText = fileName;
        });
    }
});

// Optional: Add loading spinner
function showLoading() {
    const loader = document.getElementById('loading');
    if (loader) {
        loader.style.display = 'block';
    }
}
