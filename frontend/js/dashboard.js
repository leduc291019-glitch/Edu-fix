// ==========================================================================
// EduGame-AI - Logic Quản lý Bảng Điều Khiển (dashboard.js)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Mảng trống chuẩn bị đón nhận tài liệu thật tải lên từ Backend
    let userDocuments = [];

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileNameDisplay = document.getElementById('file-name');
    const btnUpload = document.getElementById('btn-upload');
    const documentsTbody = document.getElementById('documents-tbody');
    const totalDocsLabel = document.getElementById('total-docs');
    const totalGamesLabel = document.getElementById('total-games');
    const gamesLibrary = document.getElementById('games-library');

    let selectedFile = null;

    function normalizeQuestionsForGame(rawQuestions) {
        return (Array.isArray(rawQuestions) ? rawQuestions : [])
            .map((question, index) => {
                const options = Array.isArray(question?.options)
                    ? question.options.filter(Boolean).map((opt) => String(opt).trim()).slice(0, 4)
                    : [];

                let answerIndex = null;

                if (typeof question?.answer === 'number' && Number.isInteger(question.answer) && question.answer >= 0 && question.answer < options.length) {
                    answerIndex = question.answer;
                } else if (typeof question?.answer === 'string') {
                    const normalizedAnswer = question.answer.trim().toUpperCase();

                    if (/^[A-D]$/.test(normalizedAnswer)) {
                        answerIndex = normalizedAnswer.charCodeAt(0) - 65;
                    } else {
                        const matchedIndex = options.findIndex((opt) => opt.toLowerCase() === normalizedAnswer.toLowerCase());
                        if (matchedIndex >= 0) {
                            answerIndex = matchedIndex;
                        }
                    }
                }

                if (answerIndex === null && options.length > 0) {
                    answerIndex = 0;
                }

                return {
                    ...question,
                    question: String(question?.question || '').trim(),
                    options,
                    answer: answerIndex,
                    id: question?.id ?? index + 1
                };
            })
            .filter((question) => question.question);
    }

    function renderGamesLibrary() {
        const storedGames = JSON.parse(sessionStorage.getItem('dashboard_games_library') || '[]');
        const games = Array.isArray(storedGames) ? storedGames : [];

        totalGamesLabel.textContent = games.length;

        if (!gamesLibrary) {
            return;
        }

        if (games.length === 0) {
            gamesLibrary.innerHTML = '<div style="padding: 16px; border: 1px dashed rgba(255,255,255,0.25); border-radius: 12px; color: rgba(255,255,255,0.7);">Chưa có bộ trò chơi nào. Hãy tạo một bộ câu hỏi từ tài liệu đầu tiên.</div>';
            return;
        }

        gamesLibrary.innerHTML = games.map((game, index) => `
            <div style="padding: 14px; border: 1px solid rgba(255,255,255,0.16); border-radius: 12px; background: rgba(255,255,255,0.08);">
                <div style="font-weight: 700; margin-bottom: 6px;">${game.title || `Trò chơi ${index + 1}`}</div>
                <div style="font-size: 0.95rem; color: rgba(255,255,255,0.75); margin-bottom: 8px;">${game.sourceName || 'Tài liệu'}</div>
                <div style="font-size: 0.9rem; color: rgba(255,255,255,0.65); margin-bottom: 10px;">${game.questionCount || 0} câu hỏi</div>
                <button class="btn-action play-game-btn" data-game-index="${index}" style="width: 100%; justify-content: center;">
                    <i class="fa-solid fa-play"></i> Vào chơi
                </button>
            </div>
        `).join('');

        gamesLibrary.querySelectorAll('.play-game-btn').forEach(button => {
            button.addEventListener('click', () => {
                const gameIndex = Number(button.getAttribute('data-game-index'));
                const game = games[gameIndex];
                if (game && Array.isArray(game.questions)) {
                    sessionStorage.setItem('current_game_questions', JSON.stringify({
                        questions: game.questions,
                        source: 'dashboard-library',
                        generatedAt: new Date().toISOString()
                    }));
                    window.location.href = 'game.html';
                }
            });
        });
    }

    function renderDocuments() {
        totalDocsLabel.textContent = userDocuments.length;
        totalGamesLabel.textContent = JSON.parse(sessionStorage.getItem('dashboard_games_library') || '[]').length;

        if (userDocuments.length === 0) {
            documentsTbody.innerHTML = `
                <tr>
                    <td colspan=\"3\" style=\"text-align: center; color: rgba(255,255,255,0.6);\">Chưa có tài liệu nào được tải lên hệ thống.</td>
                </tr>`;
            return;
        }

        documentsTbody.innerHTML = userDocuments.map(doc => `
            <tr>
                <td><i class="fa-regular fa-file-lines" style="margin-right: 8px;"></i> ${doc.name}</td>
                <td>${doc.date}</td>
                <td>
                    <button class="btn-action generate-btn" data-id="${doc.id}">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Tạo Trò Chơi AI
                    </button>
                </td>
            </tr>
        `).join('');

        attachGameGenerationEvents();
    }

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFileSelection(e.target.files[0]); });

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = "rgba(255, 255, 255, 0.25)"; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.background = "rgba(255, 255, 255, 0.1)"; });
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.style.background = "rgba(255, 255, 255, 0.1)"; if (e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]); });

    function handleFileSelection(file) {
        selectedFile = file;
        fileNameDisplay.innerHTML = `<i class="fa-solid fa-paperclip"></i> Sẵn sàng: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
        fileInfo.className = "file-info-visible";
    }

    // --- ĐÃ SỬA: GỌI SERVICE UPLOAD THẬT SANG SERVER ---
    btnUpload.addEventListener('click', async () => {
        if (!selectedFile) return;

        btnUpload.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang tải lên Server...`;
        btnUpload.disabled = true;

        const serverResp = await UPLOAD_SERVICE.uploadFileToServer(selectedFile);

        if (serverResp) {
            // serverResp may contain questions generated by Gemini
            const serverDoc = {
                id: serverResp.fileId,
                name: serverResp.fileName,
                date: serverResp.uploadDate
            };

            userDocuments.unshift(serverDoc);
            selectedFile = null;
            fileInput.value = "";
            fileInfo.className = "file-info-hidden";
            renderDocuments();

            // If backend returned AI-generated questions, create a game automatically
            if (Array.isArray(serverResp.questions) && serverResp.questions.length >= 1) {
                const normalizedQuestions = normalizeQuestionsForGame(serverResp.questions).slice(0, 20);
                const storedGames = JSON.parse(sessionStorage.getItem('dashboard_games_library') || '[]');
                const nextGame = {
                    title: `Trò chơi ${storedGames.length + 1}`,
                    sourceName: serverDoc.name,
                    questionCount: normalizedQuestions.length,
                    questions: normalizedQuestions
                };
                storedGames.unshift(nextGame);
                sessionStorage.setItem('dashboard_games_library', JSON.stringify(storedGames));

                // Set current game and redirect to game view
                sessionStorage.setItem('current_game_questions', JSON.stringify({ questions: normalizedQuestions, source: 'upload', generatedAt: new Date().toISOString() }));
                window.location.href = 'game.html';
                return;
            }

            alert("Tài liệu đã được tải lên thư mục uploads thành công!");
        }

        btnUpload.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Tải lên hệ thống`;
        btnUpload.disabled = false;
    });

    function attachGameGenerationEvents() {
        document.querySelectorAll('.generate-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const docId = e.currentTarget.getAttribute('data-id');
                const clickedBtn = e.currentTarget;

                clickedBtn.innerHTML = `<i class="fa-solid fa-gears fa-spin"></i> AI đang phân tích...`;
                clickedBtn.style.opacity = "0.7";
                clickedBtn.disabled = true;

                if (typeof AI_SERVICE !== 'undefined' && AI_SERVICE.generateGameQuestions) {
                    const questions = await AI_SERVICE.generateGameQuestions(docId, 'quiz');
                    const normalizedQuestions = normalizeQuestionsForGame(questions).slice(0, 20);

                    if (normalizedQuestions.length >= 20) {
                        const payload = {
                            questions: normalizedQuestions,
                            source: 'dashboard',
                            generatedAt: new Date().toISOString()
                        };
                        sessionStorage.setItem('current_game_questions', JSON.stringify(payload));

                        const storedGames = JSON.parse(sessionStorage.getItem('dashboard_games_library') || '[]');
                        const nextGame = {
                            title: `Trò chơi ${storedGames.length + 1}`,
                            sourceName: userDocuments.find(doc => doc.id === docId)?.name || 'Tài liệu',
                            questionCount: normalizedQuestions.length,
                            questions: normalizedQuestions
                        };
                        storedGames.unshift(nextGame);
                        sessionStorage.setItem('dashboard_games_library', JSON.stringify(storedGames));
                        renderGamesLibrary();
                        window.location.href = 'game.html';
                    } else if (Array.isArray(questions) && questions.length > 0) {
                        const payload = {
                            questions: normalizedQuestions.length > 0 ? normalizedQuestions : questions.slice(0, 20),
                            source: 'dashboard-partial',
                            generatedAt: new Date().toISOString()
                        };
                        sessionStorage.setItem('current_game_questions', JSON.stringify(payload));

                        const storedGames = JSON.parse(sessionStorage.getItem('dashboard_games_library') || '[]');
                        const nextGame = {
                            title: `Trò chơi ${storedGames.length + 1}`,
                            sourceName: userDocuments.find(doc => doc.id === docId)?.name || 'Tài liệu',
                            questionCount: (normalizedQuestions.length > 0 ? normalizedQuestions : questions.slice(0, 20)).length,
                            questions: normalizedQuestions.length > 0 ? normalizedQuestions : questions.slice(0, 20)
                        };
                        storedGames.unshift(nextGame);
                        sessionStorage.setItem('dashboard_games_library', JSON.stringify(storedGames));
                        renderGamesLibrary();
                        window.location.href = 'game.html';
                    } else {
                        alert('Không thể tạo bộ câu hỏi từ tài liệu này. Vui lòng thử lại với một tài liệu khác hoặc kiểm tra kết nối AI.');
                        resetBtn();
                    }
                } else {
                    alert("Lỗi: Không tìm thấy dịch vụ AI_SERVICE.");
                    resetBtn();
                }

                function resetBtn() {
                    clickedBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Tạo Trò Chơi AI`;
                    clickedBtn.style.opacity = "1";
                    clickedBtn.disabled = false;
                }
            });
        });
    }

    renderDocuments();
    renderGamesLibrary();
});