from django.urls import path
from . import views

urlpatterns = [
    # ================= HOME =================
    path("", views.index, name="index"),
    path("branches/", views.branches, name="branches"),
    path("branches/<int:branch_id>/", views.branch_detail, name="branch_detail"),

    # ================= AUTH =================
    path("signup/", views.signup_user, name="signup_user"),
    path("login/", views.login_user, name="login_user"),
    path("logout/", views.logout_user, name="logout"),

    # ================= HEALTH A-Z =================
    path("health-a-z/", views.health_az, name="health_az"),
    path("nhs-conditions/<slug:slug>/", views.nhs_condition_detail, name="nhs_condition_detail"),

    # ================= APPOINTMENTS =================
    path("appointments/create/", views.create_appointment, name="create_appointment"),
    path("appointments/booked/", views.booked_slots, name="booked_slots"),

    # ================= ADMIN =================
    path("admin-login/", views.admin_login, name="admin_login"),
    path("admin-dashboard/", views.admin_dashboard, name="admin_dashboard"),
    path("admin-dashboard/appointments/", views.admin_appointments, name="admin_appointments"),
    path("admin-dashboard/user-history/", views.user_history, name="user_history"),
    path("admin-dashboard/activity-log/", views.activity_log, name="activity_log"),
    path("admin-dashboard/reports/", views.admin_reports, name="admin_reports"),
    path("admin-dashboard/reports/data/", views.admin_reports_data, name="admin_reports_data"),

    # ================= SERVICES =================
    path("pharmacy-first/", views.pharmacy_first, name="pharmacy_first"),
    path("ear-infection/", views.ear_infection, name="ear_infection"),
    path("impetigo/", views.impetigo, name="impetigo"),
    path("insect-bite/", views.insect_bite, name="insect_bite"),
    path("shingles/", views.shingles, name="shingles"),
    path("sinusitis/", views.sinusitis, name="sinusitis"),
    path("sorethroat/", views.sorethroat, name="sorethroat"),
    path("uti/", views.uti, name="uti"),
    path("pharmacy-services/", views.pharmacy_services, name="pharmacy_services"),


    path("private-services/", views.private_services, name="private_services"),
    path("covid19/", views.covid19, name="covid19"),
    path("counter-medication/", views.counter_medication, name="counter_medication"),
    path("ear-wax-removal/", views.earwax, name="earwax"),
    path("travel-clinic/", views.travel_clinic, name="travel_clinic"),

    # Travel Vaccines (your pages)
    path("altitude-sickness/", views.altitude_sickness, name="altitude_sickness"),
    path("cholera/", views.cholera, name="cholera"),
    path("dtp/", views.dtp, name="dtp"),
    path("dengue/", views.dengue, name="dengue"),
    path("hepatitis-a/", views.hepatitis_a, name="hepatitis_a"),
    path("hepatitis-b/", views.hepatitis_b, name="hepatitis_b"),
    path("japanese-encephalitis/", views.japanese_encephalitis, name="japanese_encephalitis"),
    path("mmr/", views.mmr, name="mmr"),
    path("malaria/", views.malaria, name="malaria"),
    path("yellow-fever/", views.yellow_fever, name="yellow_fever"),
    path("typhoid/", views.typhoid, name="typhoid"),
    path("tick-borne-encephalitis/", views.tick_borne, name="tick_borne"),
    path("menb/", views.menb, name="menb"),
    path("menacwy/", views.menacwy, name="menacwy"),

    # Other
    path("jet-lag/", views.jetlag, name="jet_lag"),
    path("weight-loss/", views.weight_loss, name="weight_loss"),
    path("private-prescription/", views.private_prescription, name="private_prescription"),
    path("repeat-prescription/", views.repeat_prescription, name="repeat_prescription"),
    path("medication-service/", views.medication_service, name="medication_service"),
    path("emergency-dispensing/", views.emergency_dispensing, name="emergency_dispensing"),
    path("electronic-prescription/", views.electronic_prescription, name="electronic_prescription"),
    path("disposal-unwanted-medication/", views.disposal_unwanted_medication, name="disposal_unwanted_medication"),
    path("discharge-medication/", views.discharge_medication, name="discharge_medication"),
    path("flu-vaccination/", views.flu_vaccination, name="flu_vaccination"),
    path("blood-pressure/", views.blood_pressure, name="blood_pressure"),
    path("nhs-services/", views.nhs_services, name="nhs_services"),
    path("healthy-living-zone/", views.healthy_living_zone, name="healthy_living_zone"),
    path("lose-weight/", views.lose_weight, name="lose_weight"),
    path("alcohol-support/", views.alcohol_support, name="alcohol_support"),
    path("quit-smoking/", views.quit_smoking, name="quit_smoking"),
    path("blog/", views.blog, name="blog"),
    path("3service/", views.service_three, name="3service"),
]
