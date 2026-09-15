const fileInput = document.getElementById("fileInput");
const checkBtn = document.getElementById("checkBtn");
const fileInfo = document.getElementById("fileInfo");
const result = document.getElementById("result");

fileInput.addEventListener("change", function () {

    const file = fileInput.files[0];

    if (!file) {
        fileInfo.textContent = "No file selected";
        return;
    }

    fileInfo.innerHTML = `
        <strong>File:</strong> ${file.name}<br>
        <strong>Size:</strong> ${formatFileSize(file.size)}
    `;

    result.textContent = "SHA-256 hash will appear here.";
});

const workerSource = `
self.onmessage = async (event) => {
    const file = event.data;
    try {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const hashHex = Array.from(new Uint8Array(hashBuffer))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
        self.postMessage({ ok: true, hash: hashHex });
    } catch (error) {
        self.postMessage({ ok: false, error: error.message });
    }
};
`;

checkBtn.addEventListener("click", function () {

    const file = fileInput.files[0];

    if (!file) {
        result.textContent = " Please select a file first.";
        return;
    }

    result.textContent = " Calculating SHA-256...";
    checkBtn.disabled = true;

    const workerURL = URL.createObjectURL(
        new Blob([workerSource], { type: "text/javascript" })
    );

    const worker = new Worker(workerURL);

    const cleanup = () => {
        worker.terminate();
        URL.revokeObjectURL(workerURL);
        checkBtn.disabled = false;
    };

    worker.onmessage = (event) => {

        const { ok, hash, error } = event.data;

        if (ok) {
            result.innerHTML = `
                <strong>SHA-256:</strong><br><br>
                ${hash}
            `;
        } else {
            result.textContent = " Unable to calculate file hash.";
            console.error(error);
        }

        cleanup();
    };

    worker.onerror = (error) => {
        result.textContent = " Unable to calculate file hash.";
        console.error(error);
        cleanup();
    };

    worker.postMessage(file);
});

function formatFileSize(bytes) {

    if (bytes < 1024) {
        return bytes + " Bytes";
    }

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
