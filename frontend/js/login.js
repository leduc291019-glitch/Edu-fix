document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");
    const registerButton = document.querySelector(".register-btn");

    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {

            e.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!email || !password) {
                alert("Vui lòng nhập đầy đủ thông tin.");
                return;
            }

            localStorage.setItem("email", email);

            alert("Đăng nhập thành công!");

            window.location.href = "dashboard.html";
        });
    }

    if (registerButton) {
        registerButton.addEventListener("click", () => {
            alert("Chức năng đăng ký sẽ được xây dựng ở phần Backend.");
        });
    }

});