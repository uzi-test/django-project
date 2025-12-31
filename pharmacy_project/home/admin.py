# home/admin.py
from django.contrib import admin
from .models import Branch

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name','phone','latitude','longitude')
    search_fields = ('name','address','phone')
