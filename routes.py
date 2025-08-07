from functools import wraps
import os
import json
import qrcode
import stripe
from io import BytesIO
import base64
from urllib.parse import urljoin
from auth0_auth import require_login

from flask import session, render_template, request, redirect, url_for, flash
from flask_login import current_user
from app import app, db
from models import User, CV
from auth0_auth import make_auth0_blueprint
def require_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            session["next_url"] = get_next_navigation_url(request)
            return redirect(url_for('auth0.login'))
        return f(*args, **kwargs)
    return decorated_function

def get_next_navigation_url(request):
    is_navigation_url = (
        request.headers.get('Sec-Fetch-Mode') == 'navigate' and
        request.headers.get('Sec-Fetch-Dest') == 'document'
    )
    if is_navigation_url:
        return request.url
    return request.referrer or request.url

# Register authentication blueprint
app.register_blueprint(make_auth0_blueprint(), url_prefix="/auth")

# Configure Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

# Make session permanent
@app.before_request
def make_session_permanent():
    session.permanent = True

@app.route('/')
def index():
    """Landing page for logged out users, home page for logged in users"""
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    return render_template('index.html')

@app.route('/home')
@require_login
def home():
    """Home page for authenticated users"""
    user_cvs = CV.query.filter_by(user_id=current_user.id).order_by(CV.updated_at.desc()).all()
    return render_template('home.html', user=current_user, cvs=user_cvs)

@app.route('/create-cv', methods=['GET', 'POST'])
@require_login
def create_cv():
    """Create a new CV"""
    if not current_user.can_create_cv:
        flash('Your trial has expired. Please subscribe to continue creating CVs.', 'warning')
        return redirect(url_for('subscription'))
    
    if request.method == 'POST':
        cv = CV(
            user_id=current_user.id,
            title=request.form.get('title'),
            full_name=request.form.get('full_name'),
            email=request.form.get('email'),
            phone=request.form.get('phone'),
            address=request.form.get('address'),
            summary=request.form.get('summary'),
            website_url=request.form.get('website_url'),
            linkedin_url=request.form.get('linkedin_url'),
            github_url=request.form.get('github_url'),
            experience=request.form.get('experience'),
            education=request.form.get('education'),
            skills=request.form.get('skills'),
            projects=request.form.get('projects')
        )
        db.session.add(cv)
        db.session.commit()
        generate_qr_code(cv)
        flash('CV created successfully!', 'success')
        return redirect(url_for('view_cv', cv_id=cv.id))
    
    return render_template('create_cv.html')

@app.route('/edit-cv/<int:cv_id>', methods=['GET', 'POST'])
@require_login
def edit_cv(cv_id):
    """Edit an existing CV"""
    cv = CV.query.filter_by(id=cv_id, user_id=current_user.id).first_or_404()
    
    if request.method == 'POST':
        cv.title = request.form.get('title')
        cv.full_name = request.form.get('full_name')
        cv.email = request.form.get('email')
        cv.phone = request.form.get('phone')
        cv.address = request.form.get('address')
        cv.summary = request.form.get('summary')
        cv.website_url = request.form.get('website_url')
        cv.linkedin_url = request.form.get('linkedin_url')
        cv.github_url = request.form.get('github_url')
        cv.experience = request.form.get('experience')
        cv.education = request.form.get('education')
        cv.skills = request.form.get('skills')
        cv.projects = request.form.get('projects')
        db.session.commit()
        generate_qr_code(cv)
        flash('CV updated successfully!', 'success')
        return redirect(url_for('view_cv', cv_id=cv.id))
    
    return render_template('create_cv.html', cv=cv, edit_mode=True)

@app.route('/cv/<int:cv_id>')
@require_login
def view_cv(cv_id):
    """View CV details with QR code"""
    cv = CV.query.filter_by(id=cv_id, user_id=current_user.id).first_or_404()
    if not cv.qr_code_path:
        generate_qr_code(cv)
    experience = json.loads(cv.experience) if cv.experience else []
    education = json.loads(cv.education) if cv.education else []
    skills = cv.skills.split(',') if cv.skills else []
    projects = json.loads(cv.projects) if cv.projects else []
    return render_template('view_cv.html', cv=cv, 
                         experience=experience, education=education, 
                         skills=skills, projects=projects)

@app.route('/public-cv/<string:public_id>')
def public_cv(public_id):
    """Public CV view accessible via QR code"""
    cv = CV.query.filter_by(public_url_id=public_id).first_or_404()
    experience = json.loads(cv.experience) if cv.experience else []
    education = json.loads(cv.education) if cv.education else []
    skills = cv.skills.split(',') if cv.skills else []
    projects = json.loads(cv.projects) if cv.projects else []
    return render_template('public_cv.html', cv=cv, 
                         experience=experience, education=education, 
                         skills=skills, projects=projects)

@app.route('/my-cvs')
@require_login
def my_cvs():
    """List all user's CVs"""
    user_cvs = CV.query.filter_by(user_id=current_user.id).order_by(CV.updated_at.desc()).all()
    return render_template('my_cvs.html', cvs=user_cvs)

@app.route('/delete-cv/<int:cv_id>', methods=['POST'])
@require_login
def delete_cv(cv_id):
    """Delete a CV"""
    cv = CV.query.filter_by(id=cv_id, user_id=current_user.id).first_or_404()
    db.session.delete(cv)
    db.session.commit()
    flash('CV deleted successfully!', 'success')
    return redirect(url_for('my_cvs'))

@app.route('/subscription')
@require_login
def subscription():
    return render_template('subscription.html', user=current_user)

@app.route('/create-checkout-session', methods=['POST'])
@require_login
def create_checkout_session():
    try:
        YOUR_DOMAIN = request.url_root.rstrip('/')
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Digitallab CV Pro Subscription',
                        'description': 'Unlimited CV creation and QR code sharing',
                    },
                    'unit_amount': 999,
                    'recurring': {'interval': 'month'},
                },
                'quantity': 1,
            }],
            mode='subscription',
            success_url=YOUR_DOMAIN + '/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=YOUR_DOMAIN + '/cancel',
            metadata={'user_id': current_user.id}
        )
    except Exception as e:
        return str(e)
    return redirect(checkout_session.url, code=303)

@app.route('/success')
@require_login
def success():
    session_id = request.args.get('session_id')
    if session_id:
        try:
            session_obj = stripe.checkout.Session.retrieve(session_id)
            if session_obj.payment_status == 'paid':
                current_user.subscription_active = True
                current_user.stripe_customer_id = session_obj.customer
                db.session.commit()
                flash('Subscription activated successfully!', 'success')
        except Exception:
            flash('Error processing payment. Please contact support.', 'error')
    return render_template('success.html')

@app.route('/cancel')
def cancel():
    return render_template('cancel.html')

def generate_qr_code(cv):
    public_url = urljoin(request.url_root, f'/public-cv/{cv.public_url_id}')
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L,
                       box_size=10, border=4)
    qr.add_data(public_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    cv.qr_code_path = f"data:image/png;base64,{img_str}"
    db.session.commit()

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500