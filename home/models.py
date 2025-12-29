from django.db import models
from django.contrib.auth.models import User


class Branch(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name


class UserActivity(models.Model):
    ACTION_CHOICES = [
        ("signup", "Signup"),
        ("login", "Login"),
        ("logout", "Logout"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp:%Y-%m-%d %H:%M}"


# ✅ APPOINTMENT MODEL (FIXED)
class Appointment(models.Model):
    service = models.CharField(max_length=200)

    date = models.DateField()
    time = models.TimeField()  # ✅ FIX: proper time type

    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    dob = models.CharField(max_length=20)

    postcode = models.CharField(max_length=20)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    nhs_number = models.CharField(max_length=20)

    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.service} - {self.first_name} {self.last_name} ({self.date} {self.time})"
