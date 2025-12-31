from django import forms

class LoginForm(forms.Form):
    email = forms.EmailField(
        label="Email",
        widget=forms.EmailInput(attrs={
            'placeholder': 'Enter your email',
            'class': 'form-control border-0 border-bottom rounded-0 shadow-none',
            'style': 'background: transparent;'
        })
    )

    password = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(attrs={
            'placeholder': 'Enter your password',
            'class': 'form-control border-0 border-bottom rounded-0 shadow-none',
            'style': 'background: transparent;'
        })
    )
