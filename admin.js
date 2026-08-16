(function () {
    const API_BASE = (window.location.origin && window.location.origin !== 'null')
        ? window.location.origin
        : 'http://localhost:8000';
    const DEFAULT_PASSWORD = 'admin123';

    function getToken() {
        return localStorage.getItem('adminToken') || '';
    }

    function setToken(token) {
        if (token) {
            localStorage.setItem('adminToken', token);
        } else {
            localStorage.removeItem('adminToken');
        }
    }

    async function apiFetch(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            ...options,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || 'Request failed');
        }
        return payload;
    }

    function toDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
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

    async function renderArtworkList() {
        const list = document.getElementById('artworkList');
        if (!list) return;

        try {
            const items = await apiFetch('/api/gallery');
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
                button.addEventListener('click', async () => {
                    try {
                        const idx = Number(button.dataset.index);
                        const token = getToken();
                        if (!token) {
                            alert('Please login first.');
                            return;
                        }
                        await apiFetch(`/api/gallery/${idx}`, {
                            method: 'DELETE',
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        });
                        renderArtworkList();
                    } catch (error) {
                        alert(error.message);
                    }
                });
            });

            list.querySelectorAll('.editPrice').forEach((button) => {
                button.addEventListener('click', async () => {
                    try {
                        const idx = Number(button.dataset.index);
                        const token = getToken();
                        if (!token) {
                            alert('Please login first.');
                            return;
                        }

                        const items = await apiFetch('/api/gallery');
                        const current = items[idx];
                        const itemRow = button.closest('.flex');
                        const currentPrice = current?.price || 0;

                        const form = document.createElement('div');
                        form.className = 'mt-3 p-3 border rounded bg-gray-50';
                        form.innerHTML = `
                            <div class="mb-2">
                                <label class="block text-sm mb-1">Title</label>
                                <input id="update-title-${idx}" class="w-full border rounded px-2 py-1" value="${escapeHtml(current.title || '')}" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm mb-1">Artist</label>
                                <input id="update-artist-${idx}" class="w-full border rounded px-2 py-1" value="${escapeHtml(current.artist || 'Bengazy')}" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm mb-1">Notes</label>
                                <textarea id="update-notes-${idx}" class="w-full border rounded px-2 py-1" rows="3">${escapeHtml(current.description || '')}</textarea>
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm mb-1">Price</label>
                                <input id="update-price-${idx}" type="number" class="w-full border rounded px-2 py-1" value="${currentPrice}" />
                            </div>
                            <div class="flex gap-2">
                                <button type="button" class="saveArtworkUpdate bg-secondary text-white px-3 py-1 rounded" data-index="${idx}">Save</button>
                                <button type="button" class="cancelArtworkUpdate bg-gray-200 px-3 py-1 rounded" data-index="${idx}">Cancel</button>
                            </div>
                        `;

                        const existingForm = itemRow.parentElement.querySelector('.saveArtworkUpdate');
                        if (existingForm) existingForm.closest('.bg-gray-50')?.remove();

                        itemRow.parentElement.appendChild(form);

                        form.querySelector('.cancelArtworkUpdate')?.addEventListener('click', () => form.remove());
                        form.querySelector('.saveArtworkUpdate')?.addEventListener('click', async () => {
                            const updatedTitle = document.getElementById(`update-title-${idx}`).value.trim();
                            const updatedArtist = document.getElementById(`update-artist-${idx}`).value.trim() || 'Bengazy';
                            const updatedNotes = document.getElementById(`update-notes-${idx}`).value.trim();
                            const updatedPrice = Number(document.getElementById(`update-price-${idx}`).value) || 0;

                            if (!updatedTitle) {
                                alert('Title is required.');
                                return;
                            }

                            await apiFetch(`/api/gallery/${idx}`, {
                                method: 'PUT',
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                    title: updatedTitle,
                                    artist: updatedArtist,
                                    description: updatedNotes,
                                    price: updatedPrice,
                                }),
                            });

                            form.remove();
                            renderArtworkList();
                            alert('Artwork updated successfully.');
                        });
                    } catch (error) {
                        alert(error.message);
                    }
                });
            });
        } catch (error) {
            list.innerHTML = '<div class="text-gray-600">Unable to load artworks right now.</div>';
        }
    }

    async function renderTutorialList() {
        const list = document.getElementById('tutorialList');
        if (!list) return;

        try {
            const items = await apiFetch('/api/tutorials');
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
                button.addEventListener('click', async () => {
                    try {
                        const idx = Number(button.dataset.index);
                        const token = getToken();
                        if (!token) {
                            alert('Please login first.');
                            return;
                        }
                        await apiFetch(`/api/tutorials/${idx}`, {
                            method: 'DELETE',
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        });
                        renderTutorialList();
                    } catch (error) {
                        alert(error.message);
                    }
                });
            });
        } catch (error) {
            list.innerHTML = '<div class="text-gray-600">Unable to load tutorials right now.</div>';
        }
    }

    function showAdminState() {
        const loginCard = document.getElementById('loginCard');
        const adminPanel = document.getElementById('adminPanel');
        if (!loginCard || !adminPanel) return;

        if (getToken()) {
            loginCard.style.display = 'none';
            adminPanel.style.display = 'block';
        } else {
            loginCard.style.display = 'block';
            adminPanel.style.display = 'none';
        }
    }

    async function tryLogin(password) {
        const payload = await apiFetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ password }),
        });

        if (payload.token) {
            setToken(payload.token);
            showAdminState();
            return true;
        }
        return false;
    }

    function attachLoginHandlers() {
        const loginBtn = document.getElementById('loginBtn');
        const useDefaultBtn = document.getElementById('useDefaultBtn');
        const loginPassword = document.getElementById('loginPassword');
        const logoutBtn = document.getElementById('logoutBtn');
        const changePasswordBtn = document.getElementById('changePassword');
        const oldPasswordInput = document.getElementById('oldPassword');
        const newPasswordInput = document.getElementById('newPassword');

        loginPassword?.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const value = loginPassword.value.trim();
                if (!value) {
                    alert('Please enter your password.');
                    return;
                }
                try {
                    const ok = await tryLogin(value);
                    if (!ok) alert('Invalid password');
                } catch (error) {
                    alert(error.message);
                }
            }
        });

        loginBtn?.addEventListener('click', async () => {
            const value = (loginPassword?.value || '').trim();
            if (!value) {
                alert('Please enter your password.');
                return;
            }
            try {
                const ok = await tryLogin(value);
                if (!ok) alert('Invalid password');
            } catch (error) {
                alert(error.message);
            }
        });

        useDefaultBtn?.addEventListener('click', () => {
            const passwordInput = document.getElementById('loginPassword');
            if (passwordInput) passwordInput.value = DEFAULT_PASSWORD;
            alert('Default password is admin123.');
        });

        logoutBtn?.addEventListener('click', () => {
            setToken('');
            showAdminState();
        });

        changePasswordBtn?.addEventListener('click', async () => {
            const oldPass = (oldPasswordInput?.value || '').trim();
            const newPass = (newPasswordInput?.value || '').trim();
            if (!oldPass || !newPass) {
                alert('Fill in both current and new passwords.');
                return;
            }

            if (!getToken()) {
                alert('Please login first.');
                return;
            }

            try {
                await apiFetch('/api/change-password', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                    },
                    body: JSON.stringify({
                        currentPassword: oldPass,
                        newPassword: newPass,
                    }),
                });
                oldPasswordInput.value = '';
                newPasswordInput.value = '';
                alert('Password updated successfully.');
            } catch (error) {
                alert(error.message);
            }
        });
    }

    function attachArtworkFormHandlers() {
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
            const token = getToken();
            if (!token) {
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

            try {
                await apiFetch('/api/gallery', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ title, artist, description, price, cover, progress }),
                });
                form.reset();
                coverPreview.src = '';
                coverPreview.classList.add('hidden');
                renderArtworkList();
                alert('Artwork uploaded successfully.');
            } catch (error) {
                alert(error.message);
            }
        });

        clearBtn?.addEventListener('click', () => {
            if (confirm('Clear all uploaded gallery items from the server?')) {
                alert('This server currently stores data; full delete flow can be added next.');
            }
        });
    }

    function attachTutorialFormHandlers() {
        const tutorialForm = document.getElementById('tutorialForm');
        const clearBtn = document.getElementById('clearTutorials');
        if (!tutorialForm) return;

        tutorialForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const token = getToken();
            if (!token) {
                alert('Please login first.');
                return;
            }

            const title = document.getElementById('tutorialTitle').value.trim() || 'Untitled tutorial';
            const url = document.getElementById('tutorialURL').value.trim();
            if (!url) {
                alert('Please provide a link.');
                return;
            }

            try {
                await apiFetch('/api/tutorials', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ title, url }),
                });
                tutorialForm.reset();
                renderTutorialList();
                alert('Tutorial link saved successfully.');
            } catch (error) {
                alert(error.message);
            }
        });

        clearBtn?.addEventListener('click', () => {
            if (confirm('Clear tutorial links?')) {
                alert('Full tutorial delete support can be added in the backend next.');
            }
        });
    }

    function init() {
        showAdminState();
        attachLoginHandlers();
        attachArtworkFormHandlers();
        attachTutorialFormHandlers();
        renderArtworkList();
        renderTutorialList();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
