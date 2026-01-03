import json
from datetime import datetime, timedelta, time

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.contrib import messages
from django.contrib.auth.decorators import login_required, user_passes_test
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from django.db.models import Count

from .models import Branch, UserActivity, Appointment


# =========================
# ✅ HELPERS
# =========================
def is_superuser(user):
    return user.is_authenticated and user.is_superuser


# =========================
# ✅ AUTH
# =========================
def signup_user(request):
    if request.method == "POST":
        username = request.POST.get("username")
        email = request.POST.get("email")
        password = request.POST.get("password")

        if not username or not email or not password:
            return JsonResponse({"status": "error", "message": "All fields are required."})

        if User.objects.filter(username=username).exists():
            return JsonResponse({"status": "error", "message": "Username already exists."})

        if User.objects.filter(email=email).exists():
            return JsonResponse({"status": "error", "message": "Email already registered."})

        user = User.objects.create_user(username=username, email=email, password=password)
        user.save()
        login(request, user)

        UserActivity.objects.create(user=user, action="signup")
        messages.success(request, "Account created successfully! 🎉")
        return JsonResponse({"status": "ok", "message": "Account created successfully!"})

    return JsonResponse({"status": "error", "message": "Invalid request."})


def login_user(request):
    if request.method == "POST":
        email = request.POST.get("username")  # frontend field is "username", but contains email
        password = request.POST.get("password")

        if not email or not password:
            return JsonResponse({"status": "error", "message": "Email and password required."})

        try:
            user_obj = User.objects.get(email=email)
            username = user_obj.username
        except User.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Invalid email or password."})

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            UserActivity.objects.create(user=user, action="login")
            messages.success(request, f"Welcome back, {user.username}! 👋")
            return JsonResponse({"status": "ok", "message": "Login successful!"})
        else:
            return JsonResponse({"status": "error", "message": "Invalid email or password."})

    return JsonResponse({"status": "error", "message": "Invalid request."})


def logout_user(request):
    if request.user.is_authenticated:
        UserActivity.objects.create(user=request.user, action="logout")
    logout(request)
    messages.info(request, "You’ve been logged out successfully.")
    return redirect("index")


# =========================
# ✅ PAGES
# =========================
def index(request):
    testimonials = [
        {"name": "صافية حكي", "date": "04/09/2025", "rating": 5, "text": "", "avatar": "images/safi.png"},
        {"name": "Saleem malayalam", "date": "01/09/2025", "rating": 5,
         "text": "Salma provided excellent service during my blood test...", "avatar": "images/saleem.png"},
        {"name": "Lila Zamime", "date": "28/08/2025", "rating": 5,
         "text": "A very diligent professional 👍👍👍.", "avatar": "images/lila.png"},
        {"name": "Fizzi Ahmed", "date": "18/08/2025", "rating": 5,
         "text": "I have my cholesterol and diabetes checked today...", "avatar": None},
        {"name": "Abubakar Zainab", "date": "12/08/2025", "rating": 5,
         "text": "Used pharmacy first service, the staff were very polite...", "avatar": None},
    ]
    return render(request, "home/index.html", {"testimonials": testimonials})


def branches(request):
    qs = Branch.objects.all()
    branches_list = list(qs.values('id', 'name', 'address', 'phone', 'latitude', 'longitude'))
    return render(request, "home/branches.html", {
        'branches': qs,
        'branches_list': branches_list,
    })


def branch_detail(request, branch_id):
    branch = get_object_or_404(Branch, id=branch_id)
    return render(request, "home/branch_detail.html", {'branch': branch})


# =========================
# ✅ ADMIN
# =========================
def admin_login(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)

        if user is not None and user.is_superuser:
            login(request, user)
            messages.success(request, f"Welcome {user.username} 👑")
            return redirect("admin_dashboard")
        else:
            messages.error(request, "Invalid admin credentials or permission denied.")
            return render(request, "home/admin_login.html")

    return render(request, "home/admin_login.html")


@login_required(login_url='admin_login')
@user_passes_test(lambda u: u.is_superuser, login_url='admin_login')
def admin_dashboard(request):
    users = User.objects.all().order_by('-date_joined')
    activities = UserActivity.objects.select_related('user').order_by('-timestamp')[:50]
    return render(request, "home/admin_dashboard.html", {
        'users': users,
        'activities': activities,
    })


@login_required(login_url='admin_login')
@user_passes_test(is_superuser, login_url='admin_login')
def admin_reports(request):
    return render(request, "home/partials/admin_reports.html")


def _generate_daily_slots(start_t=time(9, 0), end_t=time(15, 0), step_minutes=60):
    slots = []
    cur = datetime.combine(datetime.today().date(), start_t)
    end = datetime.combine(datetime.today().date(), end_t)
    while cur <= end:
        slots.append(cur.time().strftime("%H:%M"))
        cur += timedelta(minutes=step_minutes)
    return slots


@login_required(login_url='admin_login')
@user_passes_test(is_superuser, login_url='admin_login')
def admin_reports_data(request):
    days = int(request.GET.get("days", 30))
    today = datetime.today().date()

    start_date = today
    end_date = today + timedelta(days=days - 1)

    qs = (
        Appointment.objects
        .filter(date__range=[start_date, end_date])
        .values("date")
        .annotate(booked=Count("id"))
        .order_by("date")
    )

    booked_map = {x["date"]: int(x["booked"]) for x in qs}
    total_slots = len(_generate_daily_slots())

    labels, booked_series, open_series = [], [], []
    d = start_date
    while d <= end_date:
        labels.append(d.strftime("%d-%m-%Y"))
        booked_count = int(booked_map.get(d, 0))
        booked_series.append(booked_count)
        open_series.append(max(total_slots - booked_count, 0))
        d += timedelta(days=1)

    return JsonResponse({
        "status": "ok",
        "labels": labels,
        "booked": booked_series,
        "open": open_series,
        "total_slots_per_day": total_slots
    })


@login_required(login_url='admin_login')
@user_passes_test(is_superuser, login_url='admin_login')
def user_history(request):
    activities = UserActivity.objects.filter(action="login").select_related("user").order_by("-timestamp")[:200]
    data = [{
        "username": act.user.username,
        "email": act.user.email,
        "timestamp": act.timestamp.strftime("%d-%m-%Y %H:%M:%S"),
    } for act in activities]
    return JsonResponse({"status": "ok", "history": data})


@login_required(login_url='admin_login')
@user_passes_test(is_superuser, login_url='admin_login')
def activity_log(request):
    activities = UserActivity.objects.select_related('user').order_by('-timestamp')[:200]
    data = [{
        "username": act.user.username,
        "email": act.user.email,
        "action": act.action,
        "timestamp": act.timestamp.strftime("%d-%m-%Y %H:%M:%S"),
    } for act in activities]
    return JsonResponse({"status": "ok", "activities": data})


@login_required(login_url='login')
@user_passes_test(is_superuser, login_url='login')
def dashboard(request):
    filter_action = request.GET.get("action")
    users = User.objects.all().order_by('-date_joined')
    activities = UserActivity.objects.select_related('user').order_by('-timestamp')
    if filter_action in ["login", "signup", "logout"]:
        activities = activities.filter(action=filter_action)
    return render(request, 'home/dashboard.html', {
        'users': users,
        'activities': activities[:50],
        'filter_action': filter_action,
    })


# =========================
# ✅ APPOINTMENTS
# =========================
@require_GET
def booked_slots(request):
    date_str = request.GET.get("date")
    if not date_str:
        return JsonResponse({"status": "error", "message": "date is required"}, status=400)

    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"status": "error", "message": "Invalid date format (YYYY-MM-DD)"}, status=400)

    times = list(Appointment.objects.filter(date=d).values_list("time", flat=True))
    return JsonResponse({"status": "ok", "times": times})


@csrf_exempt
def create_appointment(request):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Invalid request"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)

    required = [
        "service", "date", "time",
        "first_name", "last_name", "dob",
        "postcode", "email", "phone", "nhs_number"
    ]
    for f in required:
        if not data.get(f):
            return JsonResponse({"status": "error", "message": f"{f} is required"}, status=400)

    if Appointment.objects.filter(date=data["date"], time=data["time"]).exists():
        return JsonResponse(
            {"status": "error", "message": "This time slot is already booked. Please choose another time."},
            status=409
        )

    appt = Appointment.objects.create(
        service=data["service"],
        date=data["date"],
        time=data["time"],
        first_name=data["first_name"],
        last_name=data["last_name"],
        dob=data["dob"],
        postcode=data["postcode"],
        email=data["email"],
        phone=data["phone"],
        nhs_number=data["nhs_number"],
        note=data.get("note", "")
    )

    return JsonResponse({"status": "ok", "id": appt.id})


@login_required(login_url='admin_login')
@user_passes_test(is_superuser, login_url='admin_login')
def admin_appointments(request):
    qs = Appointment.objects.all().order_by("-created_at")[:500]
    data = []
    for a in qs:
        data.append({
            "id": a.id,
            "name": f"{a.first_name} {a.last_name}",
            "first_name": a.first_name,
            "last_name": a.last_name,
            "service": a.service,
            "date": a.date.strftime("%d-%m-%Y"),
            "time": a.time.strftime("%H:%M"),
            "dob": a.dob,
            "postcode": a.postcode,
            "email": a.email,
            "phone": a.phone,
            "nhs": a.nhs_number,
            "note": a.note or "",
            "created_at": a.created_at.strftime("%d-%m-%Y %H:%M:%S"),
        })
    return JsonResponse({"status": "ok", "appointments": data})


# =========================
# ✅ STATIC / SERVICE PAGES
# =========================
def pharmacy_first(request): return render(request, "home/pharmacy_first.html")
def ear_infection(request): return render(request, "home/partials/earinfection.html")
def impetigo(request): return render(request, "home/partials/impetigo.html")
def insect_bite(request): return render(request, "home/partials/insectbite.html")
def shingles(request): return render(request, "home/partials/shingles.html")
def sinusitis(request): return render(request, "home/partials/sinusitis.html")
def sorethroat(request): return render(request, "home/partials/sorethroat.html")
def uti(request): return render(request, "home/partials/uti.html")

def private_services(request): return render(request, "home/partials/private_services.html")
def covid19(request): return render(request, "home/partials/covid19.html")
def counter_medication(request): return render(request, "home/partials/countermedication.html")
def earwax(request): return render(request, "home/partials/earwax.html")
def travel_clinic(request): return render(request, "home/partials/travel_clinic.html")
def altitude_sickness(request): return render(request, "home/partials/altitude_sickness.html")
def cholera(request): return render(request, "home/partials/cholera.html")
def dtp(request): return render(request, "home/partials/dtp.html")
def dengue(request): return render(request, "home/partials/dengue.html")
def hepatitis_a(request): return render(request, "home/partials/hepatitis_a.html")
def hepatitis_b(request): return render(request, "home/partials/hepatitis_b.html")
def japanese_encephalitis(request): return render(request, "home/partials/japanese_encephalitis.html")
def mmr(request): return render(request, "home/partials/mmr.html")
def malaria(request): return render(request, "home/partials/malaria.html")
def yellow_fever(request): return render(request, "home/partials/yellow_fever.html")
def typhoid(request): return render(request, "home/partials/typhoid.html")
def tick_borne(request): return render(request, "home/partials/tick_borne.html")
def menb(request): return render(request, "home/partials/menb.html")
def menacwy(request): return render(request, "home/partials/menacwy.html")
def jetlag(request): return render(request, "home/partials/jetleg.html")
def weight_loss(request): return render(request, "home/partials/weight_loss.html")

def private_prescription(request): return render(request, "home/partials/private_prescription.html")
def repeat_prescription(request): return render(request, "home/partials/repeat_prescription.html")
def medication_service(request): return render(request, "home/partials/medication_service.html")
def emergency_dispensing(request): return render(request, "home/partials/emergency_dispensing.html")
def electronic_prescription(request): return render(request, "home/partials/electronic_prescription.html")
def disposal_unwanted_medication(request): return render(request, "home/partials/disposal_unwanted_medication.html")
def discharge_medication(request): return render(request, "home/partials/discharge_medication.html")
def flu_vaccination(request): return render(request, "home/partials/flu_vaccination.html")
def blood_pressure(request): return render(request, "home/partials/blood_pressure.html")
def nhs_services(request): return render(request, "home/partials/nhs_services.html")

def healthy_living_zone(request): return render(request, "home/partials/healthy_living_zone.html")
def lose_weight(request): return render(request, "home/partials/lose_weight.html")
def alcohol_support(request): return render(request, "home/partials/alcohol_support.html")
def quit_smoking(request): return render(request, "home/partials/quit_smoking.html")
def blog(request): return render(request, "home/partials/blog.html")
def service_three(request): return render(request, "home/partials/3service.html")


# =========================
# ✅ HEALTH A-Z + CONDITION DETAIL (UPDATED)
# =========================
def health_az(request):
    return render(request, "home/partials/health_az.html")


NHS_CONDITIONS = {
    "adhd-adults": {
        "title": "ADHD in adults",
        "content": """
            <div class="nhs-inset">
              <h3>ADHD in children and young people</h3>
              <p>There is separate information about <a href="/nhs-conditions/adhd-children-young-people/">ADHD in children and young people</a>.</p>
            </div>

            <h2>Symptoms of ADHD (attention deficit hyperactivity disorder)</h2>
            <p>Symptoms of ADHD involve your ability to pay attention to things (being inattentive), having high energy levels (being hyperactive) and your ability to control your impulses (being impulsive).</p>

            <p>You may show signs of being inattentive, such as:</p>
            <ul>
              <li>being easily distracted or forgetful</li>
              <li>finding it hard to organise your time</li>
              <li>finding it hard to follow instructions or finish tasks</li>
              <li>losing things often, like your wallet, mobile or keys</li>
            </ul>

            <p>You may show signs of being hyperactive and impulsive, including:</p>
            <ul>
              <li>having a lot of energy or feeling restless</li>
              <li>being very talkative or interrupting conversations</li>
              <li>making quick decisions without thinking about what might happen as a result</li>
            </ul>

            <p>Most people with ADHD will have symptoms of both the inattentive and hyperactive-impulsive type. Some only show signs of one type.</p>
            <p>These symptoms usually start before the age of 12.</p>
            <p>ADHD is thought to be recognised less often in women than men. This may be because women with ADHD more commonly have inattentive symptoms and these can be harder to recognise than hyperactive symptoms.</p>

            <h2>Getting help with ADHD (attention deficit hyperactivity disorder)</h2>
            <p>If your ADHD symptoms are affecting your studies, work or relationships, make an appointment with a GP to find out what support is available.</p>
            <p>At your appointment, the GP will ask about your symptoms and how they affect your life. They may also want to consider other conditions that could be causing your symptoms, such as autism, Tourette's or anxiety, to help you get the right care.</p>
            <p>After the appointment, the GP may decide to refer you for an assessment with a mental health professional specialising in ADHD.</p>
            <p>If you have already been diagnosed with ADHD in childhood and need help for your symptoms, talk to your GP about getting a referral.</p>
            <p>People with ADHD may often have other conditions too, such as depression, anxiety or addictions, or a learning difficulty such as dyslexia.</p>

            <h2>What happens at an ADHD assessment</h2>
            <p>Your appointment will be with an ADHD specialist such as a psychiatrist.</p>
            <p>They’ll ask about the history of your symptoms, particularly if they started when you were a child, and how these symptoms affected you at school.</p>
            <p>The assessment will focus on different areas of your life, including:</p>
            <ul>
              <li>work and education</li>
              <li>family and friends</li>
              <li>medical history, including any mental health issues</li>
            </ul>
            <p>The specialist may want to contact someone who knows you well, such as a family member or close friend.</p>
            <p>If you’re diagnosed with ADHD, the specialist will talk to you about what this means and what will happen next, including what help and support may be available.</p>

            <div class="nhs-inset">
              <h3>Waiting times for ADHD assessments</h3>
              <p>Waiting times vary and you may have to wait several months or years to access ADHD specialist services.</p>
              <>You may be able to find a clinic with shorter waiting lists through your GP using the Right to Choose scheme.
  <a href="https://www.nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs/"
     target="_blank" rel="noopener">
    <strong>Read about Right to Choose and your choices in the NHS</strong>
  </a>.


              <p>You can ask for an NHS appointment at any clinic, including a private clinic, if it provides ADHD services for the NHS in England.</p>
              <p>
  <strong>
    <a href="https://adhduk.co.uk/diagnosis-pathways/" target="_blank" rel="noopener">
      Find out more about diagnosis pathways for adults on the ADHD UK website
    </a>
  </strong>.
</p>


            <h2>How to manage ADHD (attention deficit hyperactivity disorder)</h2>
            <p>ADHD can be managed in many ways, including lifestyle changes, changes at work, or medicines.</p>
            <p>It depends on your symptoms and how they're affecting you. Not everyone needs or wants to take medicine to help manage their ADHD symptoms.</p>
            <p>When you get a diagnosis of ADHD, your specialist will discuss ways you can be supported.</p>

            <h3>Lifestyle</h3>
            <p>There are things you can do to help yourself.</p>
            <p>Make time for physical activities you enjoy, as <strong>exercise has many health benefits</strong> and can be a good focus for your energy.</p>
            <p>Exercise also helps reduce symptoms of anxiety and depression. Anxiety and depression can make your ADHD symptoms worse.</p>
            <p>It’s important to get enough sleep. Having a regular bedtime and a quiet dark bedroom can help. Try to avoid screens, caffeine, sugar and alcohol close to bedtime.</p>
            <p>Aim for a <strong>healthy, balanced diet</strong> and regular mealtimes.</p>
            <p>You may also find it helpful to talk to friends and family about your ADHD.</p>

            <h3>Work, college or university</h3>
            <p>At your workplace or place of study, you can request changes to help you manage your ADHD. These are called “reasonable adjustments”.</p>
            <p>Reasonable adjustments may include things like:</p>
            <ul>
              <li>having a personalised work space in a quiet area</li>
              <li>having written instructions as well as spoken instructions</li>
              <li>having help from another person to plan and structure your tasks</li>
            </ul>
           <p>
  You can read more about
  <strong>
    <a href="https://adhduk.co.uk/reasonable-adjustments/" target="_blank" rel="noopener">
      workplace adjustments and other ways to help ADHD on the ADHD UK website
    </a>
  </strong>.
</p>

            <h3>Medicines</h3>
            <p>ADHD medicines must be started and monitored by an ADHD specialist.</p>
            <p>Medicines that can help with ADHD symptoms include <strong>methylphenidate</strong> or lisdexamfetamine.</p>
            <p>You may need to try more than one medicine to find out what works for you.</p>
            <p>A GP may be able to take over prescribing ADHD medicines, but only if there is a “shared care agreement” between the GP and the ADHD specialist. To find out more, talk to your ADHD specialist or GP.</p>

            <h3>Talking therapies</h3>
            <p>Talking therapies, such as <strong>cognitive behavioural therapy (CBT)</strong> or <strong>mindfulness</strong>, may be recommended for adults with ADHD.</p>

            <div class="nhs-inset">
              <h3>ADHD and driving</h3>
              <p>You must tell the DVLA if your driving is affected by your ADHD or your ADHD medicine, or both.</p>
             <p>
  <strong>
    <a href="https://www.gov.uk/adhd-and-driving"
       target="_blank" rel="noopener">
      Find out more about ADHD and driving on GOV.UK
    </a>
  </strong>
</p>

            </div>

            <h2>ADHD and mental health</h2>
            <p>People with ADHD may be more likely to have a mental health issues such as anxiety and depression.</p>
            <p>They are also at higher risk of suicide.</p>
            <p>If you're feeling like you want to end your life, it's important to tell someone.</p>
            <p>Help and support is available right now if you need it. You do not have to struggle with difficult feelings alone.</p>
          <li>
<p>
  <a href="https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/behaviours/help-for-suicidal-thoughts/"
     target="_blank" rel="noopener">
    <strong>Find out how to get help for suicidal thoughts</strong>
  </a>
</p>



            <h2>What causes ADHD (attention deficit hyperactivity disorder)</h2>
            <p>The cause of ADHD is not always known. ADHD may be caused by genetic differences and often runs in families.</p>
            <p>There are several other things linked to ADHD, including being born premature (before 37 weeks of pregnancy), having epilepsy, a brain injury and being autistic.</p>
            <p>Some people with ADHD call themselves neurodivergent. Neurodiversity describes the range of different ways our brains work.</p>

            <h2>Help and support for ADHD (attention deficit hyperactivity disorder)</h2>
            <p>If you have ADHD, there are ways to help manage your condition in addition to support from your doctor and workplace.</p>
            <p>There are ADHD support groups locally and online.</p>
            <p>There are also a number of organisations and charities that can offer information and support about ADHD.</p>

            <h3>ADHD UK</h3>
            <p>Information and support for anyone affected by ADHD.</p>
            <ul>
            <li>
  <strong>
    <a href="https://www.adhdadult.uk/resources/" target="_blank" rel="noopener">
      Resources (ADHD Adult UK)
    </a>
  </strong>
</li>

             <li>
  <strong>
    <a href="https://www.adhdadult.uk/resources/" target="_blank" rel="noopener">
      Resources (ADHD Adult UK)
    </a>
  </strong>
</li>

              <li>
    <strong>Support groups (ADHD UK)</strong> –
    <a href="https://adhduk.co.uk/support/" target="_blank" rel="noopener">
      https://adhduk.co.uk/support/
    </a>
  </li>
            </ul>

            <h3>ADHD Adult UK</h3>
            <p>Information and peer support for adults with ADHD.</p>
            <ul>
              <li>
  <strong>Website:</strong>
  <a href="https://www.adhdadult.uk/" target="_blank" rel="noopener">
    www.adhdadult.uk
  </a>
</li>

              <li>
  <strong>
    <a href="https://www.adhdadult.uk/resources/" target="_blank" rel="noopener">
      Resources (ADHD Adult UK)
    </a>
  </strong>
</li>

            <h3>MindOUT</h3>
            <p>Mental health support for the LGBTQ community.</p>
            <ul>
              <li>
  <strong>Website:</strong>
  <a href="https://mindout.org.uk/" target="_blank" rel="noopener">
    www.mindout.org.uk
  </a>
</li>
              <li>
  <strong>Website:</strong>
  <a href="https://mindout.org.uk/get-support/advice-and-information/" 
     target="_blank" 
     rel="noopener">
    <strong>Advice and information (MindOUT)</strong>
  </a>


        """
    },

"adhd-children-young-people": {
  "title": "ADHD in children and young people",
  "content": """

<!-- LINK TO ADULTS -->
<div class="nhs-inset">
  <h3>ADHD in adults</h3>
  <p>
    There is separate information about 
    <a href="/nhs-conditions/adhd-adults/">ADHD in adults</a>.
  </p>
</div>

<h2>Symptoms of ADHD (attention deficit hyperactivity disorder)</h2>

<p>
Symptoms of ADHD usually start before the age of 12. They involve a person’s
ability to pay attention to things (being inattentive), having high energy
levels (being hyperactive) and controlling impulses (being impulsive).
</p>

<p>A child or young person may show signs of being inattentive, such as:</p>
<ul>
  <li>being easily distracted</li>
  <li>finding it hard to listen or follow instructions</li>
  <li>forgetting everyday tasks</li>
</ul>

<p>They may show signs of being hyperactive and impulsive, including:</p>
<ul>
  <li>having high energy levels</li>
  <li>fidgeting or tapping hands and feet</li>
  <li>talking noisily</li>
  <li>finding it hard to wait their turn</li>
</ul>

<p>
Most children and young people with ADHD have symptoms of both inattentive and
hyperactive-impulsive types.
</p>

<p>
ADHD is thought to be recognised less often in girls than boys.
</p>

<!-- INFO GREEN BOX -->
<div class="nhs-inset">
  <p>
    Many children are easily distracted, impulsive and have high energy levels,
    particularly if they’re under the age of 5. This does not always mean ADHD.
  </p>
</div>

<h2>Getting help for ADHD (attention deficit hyperactivity disorder)</h2>

<p>
If you’re worried that ADHD may be affecting your child, talk to one of their
teachers. An older child or teenager may choose to speak to a teacher themselves.
</p>

<p>
The teacher will usually make a referral to the school’s special educational
needs co-ordinator (SENCO).
</p>

<p>
If you’re still worried, you may want to make an appointment with a GP.
</p>

<h2>What happens at an ADHD assessment</h2>

<p>
The assessment will be with one or more ADHD specialists, such as a paediatrician
or child and adolescent psychiatrist.
</p>

<p>
The specialist will talk with you and your child about symptoms and development.
</p>

<p>
If your child is diagnosed, the specialist will explain next steps and treatment.
</p>

<!-- WAITING TIMES -->
<div class="nhs-inset">
  <h3>Waiting times for ADHD assessments</h3>

  <p>
    Waiting times vary and your child may have to wait several months or years.
  </p>

  <p>
    <a href="https://www.nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs/"
       target="_blank">
       Read about Right to Choose and your choices in the NHS
    </a>
  </p>

  <p>
    <a href="https://adhduk.co.uk/diagnosis-pathways/"
       target="_blank">
       Find out more about diagnosis pathways for children on the ADHD UK website
    </a>
  </p>
</div>

<!-- ❌ NO GREEN BAR HERE -->
<h2>How to manage ADHD (attention deficit hyperactivity disorder)</h2>

<p>
There are different ways to support a child or young person with ADHD, including
lifestyle changes, changes at school and at home, or medicines.
</p>

<p>
Talk to a SENCO or school nurse about changes that could help.
</p>

<h3>Lifestyle</h3>

<p>
There are things you can do to support a child or young person with ADHD.
</p>

<!-- ✅ ONLY DO BOX HAS GREEN BAR -->
<div class="nhs-inset">
  <h3>Do</h3>
  <ul>
    <li>Make time for physical activities they enjoy.</li>
    <li>
      Encourage regular sleep.
      <a href="https://www.rcpsych.ac.uk/mental-health/parents-and-young-people/information-for-parents-and-carers/sleep-problems-for-parents/"
         target="_blank">
         Royal College of Psychiatrists advice
      </a>
    </li>
    <li>
      Encourage a
      <a href="https://www.nhs.uk/live-well/eat-well/"
         target="_blank">
         healthy, balanced diet
      </a>
    </li>
    <li>
      Keep a food and drink diary if symptoms seem affected.
    </li>
  </ul>
</div>
<h2>Support at school and at home</h2>

    <p>Discuss with a SENCO what adjustments or support may help at home and school.</p>

    <p>This may include:</p>
    <ul>
      <li>splitting up tasks, like doing homework or sitting down to eat, into 15 to 20 minute slots with a break in between each slot</li>
      <li>giving clear and simple instructions one at a time in a calm voice</li>
      <li>writing a to-do list and putting it somewhere easy to see</li>
      <li>giving praise when a child or young person does well, or making a reward chart</li>
    </ul>

    <h2>Medicine</h2>

    <p>
      ADHD medicines must be started and monitored by an ADHD specialist. This includes:
    </p>

    <ul>
      <li>
        medicine to help with ADHD symptoms, such as
        <a href="https://www.nhs.uk/medicines/methylphenidate-children/" target="_blank" rel="noopener">
          methylphenidate
        </a>
      </li>
      <li>melatonin for problems sleeping, when other methods for improving sleep have not worked</li>
    </ul>

    <p>
      Children and teenagers may need to try more than one medicine to find out what works for them.
    </p>

    <p>
      A GP may be able to take over prescribing ADHD medicines, but only if there is a “shared care agreement”
      between the GP and the ADHD specialist. To find out more, talk to your ADHD specialist or GP.
      Not everyone with ADHD needs to or wants to take medicine.
    </p>

    <h2>Talking therapies</h2>

    <p>
      Talking therapies such as
      <a href="https://www.nhs.uk/mental-health/talking-therapies-medicine-treatments/talking-therapies-and-counselling/cognitive-behavioural-therapy-cbt/" target="_blank" rel="noopener">
        cognitive behavioural therapy (CBT)
      </a>
      might be recommended to help a child or young person with ADHD with problem solving and expressing their feelings.
    </p>
    <h2>ADHD and mental health</h2>

<p>
People with ADHD may be more likely to have mental health issues such as
anxiety or depression.
</p>

<p>
They are also at higher risk of suicide.
</p>

<p>
If you're concerned about a child or young person, help and support is
available right now if they need it. They do not have to struggle with
difficult feelings alone.
</p>

<p>
<a href="https://www.nhs.uk/mental-health/children-and-young-adults/"
   target="_blank" rel="noopener">
  Find out about mental health support for children and young people
</a>
</p>

<hr>

<h2>What causes attention deficit hyperactivity disorder (ADHD)</h2>

<p>
The cause of ADHD is not always known. ADHD may be caused by genetic
differences and often runs in families.
</p>

<p>
There are several other things linked to ADHD, including being born
premature (before 37 weeks of pregnancy), having epilepsy, a brain
injury or being autistic.
</p>

<p>
Some people with ADHD call themselves neurodivergent. Neurodiversity
describes the range of different ways our brains work.
</p>

<hr>

<h2>Help and support for ADHD (attention deficit hyperactivity disorder)</h2>

<p>
If your child or teenager has ADHD, there are ways you can help them
manage their symptoms with support from their school or a doctor.
</p>

<p>
There are ADHD support groups locally and online.
</p>

<p>
There are also a number of organisations and charities that offer
information and support about ADHD.
</p>
<h3>ADHD Adult UK</h3>

<p>
Information and peer support for parents of children with ADHD, and for adults
with ADHD.
</p>

<ul>
  <li>
    <a href="https://www.adhdadult.uk/" target="_blank" rel="noopener">
      Website: www.adhdadult.uk
    </a>
  </li>
  <li>
    <a href="https://www.adhdadult.uk/resources/"
       target="_blank" rel="noopener">
      Resources (ADHD Adult UK)
    </a>
  </li>
</ul>

<h3>Young Minds</h3>

<p>Mental health support for young people.</p>

<ul>
  <li>
    <a href="https://www.youngminds.org.uk/" target="_blank" rel="noopener">
      Website: www.youngminds.org.uk
    </a>
  </li>
  <li>
    <a href="https://www.youngminds.org.uk/young-person/"
       target="_blank" rel="noopener">
      Support for young people (Young Minds)
    </a>
  </li>
  <li>
    <a href="https://www.youngminds.org.uk/parent/"
       target="_blank" rel="noopener">
      Support for parents (Young Minds)
    </a>
  </li>
</ul>

<h3>AADD-UK</h3>

<p>
Charity which lists support groups across the UK, including groups for adults,
parents and carers.
</p>

<ul>
  <li>
    <a href="https://aadduk.org/" target="_blank" rel="noopener">
      Support groups (AADD-UK)
    </a>
  </li>
</ul>

<p style="margin-top:40px;font-size:14px;color:#666;">
Last reviewed: 12 November 2025
</p>

"""
}


}


NHS_CONDITIONS["abdominal-aortic-aneurysm"] = {
    "title": "Abdominal aortic aneurysm",
    "content": """
    <p>An abdominal aortic aneurysm (AAA) is a swelling in the aorta, the artery that carries blood from the heart to the tummy (abdomen). Most aneurysms do not cause any problems, but they can be serious because there's a risk they could burst (rupture).</p>

    <h2>Symptoms of abdominal aortic aneurysm</h2>
    <p>Abdominal aortic aneurysm often has no symptoms.</p>

    <p>If an aneurysm gets bigger, you might sometimes notice:</p>
    <ul>
      <li>tummy or back pain</li>
      <li>a pulsing feeling in your tummy</li>
    </ul>

    <div class="nhs-inset">
      <h3>See a GP if:</h3>
      <ul>
        <li>you have tummy or back pain that does not go away or keeps coming back</li>
        <li>you feel a lump in your tummy</li>
      </ul>
      <p>These symptoms can be caused by lots of things and do not mean you have an abdominal aortic aneurysm, but it's best to get them checked.</p>
    </div>

    <div class="nhs-urgent">
      <h3>Call 999 if you or someone else:</h3>
      <ul>
        <li>have sudden, severe pain in your tummy or back</li>
        <li>are struggling to breathe or have stopped breathing</li>
        <li>have pale or grey skin</li>
        <li>lose consciousness</li>
      </ul>
      <p>These could be signs of an abdominal aortic aneurysm bursting (rupturing). This is a life-threatening emergency that needs to be treated in hospital as soon as possible.</p>
    </div>

    <h2>Tests for abdominal aortic aneurysm</h2>
    <p>The main test to find out if you have an abdominal aortic aneurysm is an <strong>ultrasound scan</strong> of your tummy.</p>

    <h2>Screening for abdominal aortic aneurysm</h2>
    <p>An ultrasound test is offered to all men when they turn 65.</p>

    <h2>Treatment for abdominal aortic aneurysm</h2>
    <p>Treatment depends on how big it is and if you have symptoms.</p>

    <h2>How to lower your risk</h2>
    <div class="nhs-do">
      <h3>Do</h3>
      <ul>
        <li>eat healthily</li>
        <li>exercise regularly</li>
        <li>try to lose weight if you're overweight</li>
        <li>try to cut down on alcohol</li>
      </ul>
    </div>

    <div class="nhs-dont">
      <h3>Don't</h3>
      <ul>
        <li>do not smoke</li>
      </ul>
    </div>

    <h2>Causes</h2>
    <p>An abdominal aortic aneurysm happens when the aorta becomes weakened.</p>
    
    """
    ,
"abdominal-aortic-aneurysm": {
    "title": "Abdominal aortic aneurysm",
    "content": """
    <!-- 🔴 Emergency box -->
    <div class="nhs-urgent">
      <h3>Call 999 if:</h3>
      <p>You have sudden, severe pain in your tummy or back.</p>
    </div>

    <p>
      An abdominal aortic aneurysm (AAA) is a swelling in the aorta,
      the main blood vessel that runs from the heart down through the tummy.
    </p>

    <h2>Symptoms</h2>
    <p>Most abdominal aortic aneurysms do not cause any symptoms.</p>

    <ul>
      <li>persistent tummy pain</li>
      <li>persistent lower back pain</li>
      <li>a pulsing feeling in the tummy</li>
    </ul>

    <!-- 🟢 GP box -->
    <div class="nhs-inset">
      <h3>See a GP if:</h3>
      <p>You have ongoing tummy or back pain.</p>
    </div>

    <h2>Screening</h2>
    <p>
      In England, men are offered screening for abdominal aortic aneurysm
      during the year they turn 65.
    </p>

    <h2>Treatment</h2>
    <p>
      Treatment depends on the size of the aneurysm and may include
      regular monitoring or surgery.
    </p>

    <!-- 🟢 Do / 🔴 Don't -->
    <div class="nhs-do">
      <h3>Do</h3>
      <ul>
        <li>stop smoking</li>
        <li>eat a healthy diet</li>
        <li>exercise regularly</li>
      </ul>
    </div>

    <div class="nhs-dont">
      <h3>Don't</h3>
      <ul>
        <li>ignore ongoing tummy or back pain</li>
      </ul>
    </div>
    """
}

}


def nhs_condition_detail(request, slug):
    condition = NHS_CONDITIONS.get(slug)

    # ✅ slug agar exist nahi karta to 404
    if not condition:
        from django.http import Http404
        raise Http404("Condition not found")

    return render(request, "home/partials/nhs_condition_detail.html", {
        "slug": slug,
        "condition": condition,
    })

def pharmacy_services(request):
    return render(request, "home/partials/pharmacy_services.html")
