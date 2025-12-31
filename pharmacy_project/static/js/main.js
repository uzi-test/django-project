// ================= NAVBAR SCROLL EFFECT =================
window.addEventListener("scroll", () => {
  const navbar = document.getElementById("mainNavbar");
  if (!navbar) return; // ✅ FIX (admin pages me navbar nahi hota)

  if (window.scrollY > 60) {
    navbar.classList.add("scrolled");
    navbar.classList.remove("over-hero");
  } else {
    navbar.classList.remove("scrolled");
    navbar.classList.add("over-hero");
  }
});


// ================= MEGA DROPDOWN (HOVER DESKTOP / CLICK MOBILE) =================
document.querySelectorAll(".nav-item.dropdown").forEach(dropdown => {
  const toggle = dropdown.querySelector(".nav-link.dropdown-toggle");
  const menu = dropdown.querySelector(".dropdown-menu");

  dropdown.addEventListener("mouseenter", () => {
    if (window.innerWidth >= 992) {
      dropdown.classList.add("show");
      menu.classList.add("show");
    }
  });
  dropdown.addEventListener("mouseleave", () => {
    if (window.innerWidth >= 992) {
      dropdown.classList.remove("show");
      menu.classList.remove("show");
    }
  });

  toggle.addEventListener("click", e => {
    if (window.innerWidth < 992) {
      e.preventDefault();
      dropdown.classList.toggle("show");
      menu.classList.toggle("show");
    }
  });
});

// ================= SCROLL ANIMATIONS =================
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".service-card");
  const branchSection = document.querySelector(".find-branch-section");
  const serviceSection = document.querySelector(".service-fade-section");

  function checkScroll() {
    const triggerBottom = window.innerHeight * 0.85;

    cards.forEach((card, index) => {
      const cardTop = card.getBoundingClientRect().top;
      if (cardTop < triggerBottom && !card.classList.contains("show")) {
        setTimeout(() => card.classList.add("show"), index * 150);
      }
    });

    [branchSection, serviceSection].forEach(section => {
      if (section) {
        const top = section.getBoundingClientRect().top;
        if (top < triggerBottom && !section.classList.contains("show")) {
          section.classList.add("show");
        }
      }
    });
  }

  window.addEventListener("scroll", checkScroll);
  checkScroll();

  const elements = document.querySelectorAll(".animate-on-scroll");
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("fadeInUp");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));
});

// ================= SIDEBAR MOBILE MENU =================
const sidebar = document.getElementById("mobileSidebar");
const overlay = document.getElementById("sidebarOverlay");
const toggleBtn = document.getElementById("mobileMenuToggle");
const closeBtn = document.getElementById("closeSidebar");

if (toggleBtn && sidebar && overlay) {
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  function closeSidebarFunc() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (closeBtn) closeBtn.addEventListener("click", closeSidebarFunc);
  overlay.addEventListener("click", closeSidebarFunc);
}

// ================= COLLAPSIBLE DROPDOWNS =================
document.querySelectorAll(".collapsible").forEach(section => {
  const header = section.querySelector(".collapsible-header");
  const body = section.querySelector(".collapsible-body");
  if (header) {
    header.addEventListener("click", () => {
      section.classList.toggle("open");
      body.classList.toggle("active");
    });
  }
});

// ================= LOGIN / SIGNUP / FORGOT PASSWORD MODAL =================
document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const forgotForm = document.getElementById("forgotForm");
  const signupForm = document.getElementById("signupForm");

  const forgotLink = document.getElementById("forgotPasswordLink");
  const backToLogin = document.getElementById("backToLogin");
  const signupLink = document.querySelector("#loginForm p a.text-success");
  const backToLoginFromSignup = document.getElementById("backToLoginFromSignup");

  if (forgotLink) {
    forgotLink.addEventListener("click", e => {
      e.preventDefault();
      loginForm.classList.add("d-none");
      forgotForm.classList.remove("d-none");
    });
  }

  if (backToLogin) {
    backToLogin.addEventListener("click", e => {
      e.preventDefault();
      forgotForm.classList.add("d-none");
      loginForm.classList.remove("d-none");
    });
  }

  if (signupLink) {
    signupLink.addEventListener("click", e => {
      e.preventDefault();
      loginForm.classList.add("d-none");
      forgotForm.classList.add("d-none");
      signupForm.classList.remove("d-none");
    });
  }

  if (backToLoginFromSignup) {
    backToLoginFromSignup.addEventListener("click", e => {
      e.preventDefault();
      signupForm.classList.add("d-none");
      loginForm.classList.remove("d-none");
    });
  }

  // ================== CSRF TOKEN HELPER ==================
  function getCSRFToken() {
    const name = "csrftoken";
    const cookies = document.cookie.split(";").map(c => c.trim());
    for (let cookie of cookies) {
      if (cookie.startsWith(name + "=")) {
        return decodeURIComponent(cookie.split("=")[1]);
      }
    }
    return "";
  }

  // ================= HANDLE SIGNUP FORM =================
  if (signupForm) {
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("signupEmail").value;
      const password = document.getElementById("signupPassword").value;
      const confirm = document.getElementById("confirmPassword").value;

      if (!email || !password || !confirm) {
        Swal.fire("Missing Fields", "All fields are required.", "warning");
        return;
      }

      if (password !== confirm) {
        Swal.fire("Password Mismatch", "Passwords do not match!", "error");
        return;
      }

      const response = await fetch("/signup/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRFToken": getCSRFToken(),
        },
        body: new URLSearchParams({
          username: email.split("@")[0],
          email: email,
          password: password,
        }),
      });

      const data = await response.json();
      if (data.status === "ok") {
        Swal.fire({
          icon: "success",
          title: "Account Created!",
          text: "You can now log in.",
          timer: 2000,
          showConfirmButton: false,
        });
        this.reset();
        signupForm.classList.add("d-none");
        loginForm.classList.remove("d-none");
      } else {
        Swal.fire("Signup Failed", data.message || "Try again.", "error");
      }
    });
  }

  // ================= HANDLE LOGIN FORM =================
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.querySelector("#email").value;
      const password = document.querySelector("#password").value;

      if (!email || !password) {
        Swal.fire("Missing Info", "Please enter your email and password.", "warning");
        return;
      }

      const response = await fetch("/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRFToken": getCSRFToken(),
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      const data = await response.json();
      if (data.status === "ok") {
        Swal.fire({
          icon: "success",
          title: "Welcome Back!",
          text: "You have logged in successfully.",
          showConfirmButton: false,
          timer: 1500,
        });
        const modal = bootstrap.Modal.getInstance(document.getElementById("loginModal"));
        if (modal) modal.hide();
        setTimeout(() => location.reload(), 1400);
      } else {
        Swal.fire("Login Failed", data.message || "Invalid username or password.", "error");
      }
    });
  }

  // ================= LOGOUT BUTTON =================
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      Swal.fire({
        title: "Logout?",
        text: "Are you sure you want to log out?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, logout",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#198754",
      }).then(result => {
        if (result.isConfirmed) {
          window.location.href = "/logout/";
        }
      });
    });
  }
});
