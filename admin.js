(function () {
    const DEFAULT_PASSWORD = 'admin123';

    function safeParse(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    function loadGallery() {
        return safeParse('galleryItems', []);
    }

    function saveGallery(items) {
        localStorage.setItem('galleryItems', JSON.stringify(items));
    }

    function loadTutorials() {
        return safeParse('tutorials', []);
    }

    function saveTutorials(items) {
        localStorage.setItem('tutorials', JSON.stringify(items));
    }

    function toDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function sha256Hex(value) {
        const encoder = new TextEncoder();
        const data = encoder.encode(value);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    async function ensureDefaultPassword() {
        if (!localStorage.getItem('adminPasswordHash')) {
            localStorage.setItem('adminPasswordHash', await sha256Hex(DEFAULT_PASSWORD));
        }
    }

    function isAuthenticated() {
        return localStorage.getItem('adminAuth') === 'true';
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function embedForURL(url) {
        if (!url) return '';

        const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
        if (youtubeMatch) {
            return `
                <div class="mt-2">
                    <iframe class="w-full" style="height: 240px;" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe>
                </div>
            `;
        }

        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) {
            return `
                <div class="mt-2">
                    <iframe class="w-full" style="height: 240px;" src="https://player.vimeo.com/video/${vimeoMatch[1]}" frameborder="0" allowfullscreen></iframe>
                </div>
            `;
        }

        return `
            <div class="mt-2">
                <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" class="text-secondary underline">Open link</a>
            </div>
        `;
    }

    function renderArtworkList() {
        const list = document.getElementById('artworkList');
        if (!list) return;

        const items = loadGallery();
        list.innerHTML = items.length
            ? items.map((item, index) => `
                <div class="flex items-center justify-between p-3 border rounded">
                    <div class="flex items-center gap-3">
                        <img src="${item.cover}" class="thumb" alt="${escapeHtml(item.title)}" />
                        <div>
                            <div class="font-bold">${item.title}</div>
                            <div class="text-sm text-gray-600">${item.artist || 'Bengazy'} · $${item.price || 0}</div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button data-index="${index}" class="editPrice bg-gray-200 px-3 py-1 rounded">Edit Price</button>
                        <button data-index="${index}" class="deleteItem bg-red-500 text-white px-3 py-1 rounded">Delete</button>
                    </div>
                </div>
            `).join('')
            : '<div class="text-gray-600">No artworks yet</div>';

        list.querySelectorAll('.deleteItem').forEach((button) => {
            button.addEventListener('click', () => {
                const idx = Number(button.dataset.index);
                const items = loadGallery();
                items.splice(idx, 1);
                saveGallery(items);
                renderArtworkList();
            });
        });

        list.querySelectorAll('.editPrice').forEach((button) => {
            button.addEventListener('click', () => {
                const idx = Number(button.dataset.index);
                const items = loadGallery();
                const current = items[idx];
                const nextPrice = prompt('Enter new price', current?.price || '');
                if (nextPrice !== null) {
                    items[idx].price = Number(nextPrice) || 0;
                    saveGallery(items);
                    renderArtworkList();
                }
            });
        });
    }

    function renderTutorialList() {
        const list = document.getElementById('tutorialList');
        if (!list) return;

        const items = loadTutorials();
        list.innerHTML = items.length
            ? items.map((item, index) => `
                <div class="mb-3 p-3 border rounded">
                    <div class="font-bold">${item.title}</div>
                    ${embedForURL(item.url)}
                    <div class="mt-2">
                        <button data-index="${index}" class="deleteTutorial bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                    </div>
                </div>
            `).join('')
            : '<div class="text-gray-600">No tutorials saved</div>';

        list.querySelectorAll('.deleteTutorial').forEach((button) => {
            button.addEventListener('click', () => {
                const idx = Number(button.dataset.index);
                const items = loadTutorials();
                items.splice(idx, 1);
                saveTutorials(items);
                renderTutorialList();
            });
        });
    }

    async function showAdminState() {
        const loginCard = document.getElementById('loginCard');
        const adminPanel = document.getElementById('adminPanel');
        if (!loginCard || !adminPanel) return;

        if (isAuthenticated()) {
            loginCard.style.display = 'none';
            adminPanel.style.display = 'block';
        } else {
            loginCard.style.display = 'block';
            adminPanel.style.display = 'none';
        }
    }

    async function initAuth() {
        await ensureDefaultPassword();

        const loginBtn = document.getElementById('loginBtn');
        const useDefaultBtn = document.getElementById('useDefaultBtn');
        const loginPassword = document.getElementById('loginPassword');
        const loginInput = document.getElementById('loginPassword');
        const logoutBtn = document.getElementById('logoutBtn');
        const changePasswordBtn = document.getElementById('changePassword');
        const oldPasswordInput = document.getElementById('oldPassword');
        const newPasswordInput = document.getElementById('newPassword');

        loginInput?.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const attempt = loginInput.value || '';
                const hash = await sha256Hex(attempt);
                if (hash === localStorage.getItem('adminPasswordHash')) {
                    localStorage.setItem('adminAuth', 'true');
                    loginInput.value = '';
                    await showAdminState();
                } else {
                    alert('Invalid password');
                }
            }
        });

        loginBtn?.addEventListener('click', async () => {
            const attempt = loginPassword.value || '';
            const hash = await sha256Hex(attempt);
            if (hash === localStorage.getItem('adminPasswordHash')) {
                localStorage.setItem('adminAuth', 'true');
                loginPassword.value = '';
                await showAdminState();
            } else {
                alert('Invalid password');
            }
        });

        useDefaultBtn?.addEventListener('click', async () => {
            const defaultHash = await sha256Hex(DEFAULT_PASSWORD);
            localStorage.setItem('adminPasswordHash', defaultHash);
            alert('Default password set to: admin123');
        });

        logoutBtn?.addEventListener('click', () => {
            localStorage.removeItem('adminAuth');
            showAdminState();
        });

        changePasswordBtn?.addEventListener('click', async () => {
            const oldPass = oldPasswordInput.value || '';
            const newPass = newPasswordInput.value || '';

            if (!oldPass || !newPass) {
                alert('Fill in both current and new password fields.');
                return;
            }

            const currentHash = await sha256Hex(oldPass);
            if (currentHash !== localStorage.getItem('adminPasswordHash')) {
                alert('Current password is incorrect.');
                return;
            }

            localStorage.setItem('adminPasswordHash', await sha256Hex(newPass));
            oldPasswordInput.value = '';
            newPasswordInput.value = '';
            alert('Password changed successfully.');
        });

        await showAdminState();
    }

    function initArtworkForm() {
        const form = document.getElementById('artworkForm');
        const clearBtn = document.getElementById('clearStore');
        const coverInput = document.getElementById('cover');
        const coverPreview = document.getElementById('coverPreview');

        if (!form) return;

        coverInput?.addEventListener('change', async () => {
            const file = coverInput.files?.[0];
            if (!file) {
                coverPreview.src = '';
                coverPreview.classList.add('hidden');
                return;
            }
            coverPreview.src = await toDataURL(file);
            coverPreview.classList.remove('hidden');
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!isAuthenticated()) {
                alert('Please login first.');
                return;
            }

            const title = document.getElementById('title').value.trim();
            const artist = document.getElementById('artist').value.trim() || 'Bengazy';
            const description = document.getElementById('description').value.trim();
            const price = Number(document.getElementById('price').value) || 0;
            const coverFile = document.getElementById('cover').files?.[0];
            const progressFiles = Array.from(document.getElementById('progress').files || []);

            if (!title || !coverFile) {
                alert('Please provide a title and cover image.');
                return;
            }

            const cover = await toDataURL(coverFile);
            const progress = [];
            for (const file of progressFiles) {
                progress.push(await toDataURL(file));
            }

            const items = loadGallery();
            items.unshift({ title, artist, description, price, cover, progress });
            saveGallery(items);
            form.reset();
            coverPreview.src = '';
            coverPreview.classList.add('hidden');
            renderArtworkList();
            alert('Artwork saved successfully.');
        });

        clearBtn?.addEventListener('click', () => {
            if (confirm('Clear all gallery data?')) {
                localStorage.removeItem('galleryItems');
                renderArtworkList();
            }
        });
    }

    function initTutorialForm() {
        const tutorialForm = document.getElementById('tutorialForm');
        const clearBtn = document.getElementById('clearTutorials');
        if (!tutorialForm) return;

        tutorialForm.addEventListener('submit', (event) => {
            event.preventDefault();

            if (!isAuthenticated()) {
                alert('Please login first.');
                return;
            }

            const title = document.getElementById('tutorialTitle').value.trim() || 'Untitled tutorial';
            const url = document.getElementById('tutorialURL').value.trim();

            if (!url) {
                alert('Please provide a social/media link.');
                return;
            }

            const items = loadTutorials();
            items.unshift({ title, url });
            saveTutorials(items);
            renderTutorialList();
            tutorialForm.reset();
            alert('Tutorial link saved.');
        });

        clearBtn?.addEventListener('click', () => {
            if (confirm('Clear saved tutorials?')) {
                localStorage.removeItem('tutorials');
                renderTutorialList();
            }
        });
    }

    function init() {
        initAuth();
        initArtworkForm();
        initTutorialForm();
        renderArtworkList();
        renderTutorialList();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
