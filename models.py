from datetime import datetime, timedelta
from app import db
from flask_dance.consumer.storage.sqla import OAuthConsumerMixin
from flask_login import UserMixin
from sqlalchemy import UniqueConstraint
import uuid

# (IMPORTANT) This table is mandatory for auth0 Auth, don't drop it.
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String, primary_key=True)
    email = db.Column(db.String, unique=True, nullable=True)
    first_name = db.Column(db.String, nullable=True)
    last_name = db.Column(db.String, nullable=True)
    profile_image_url = db.Column(db.String, nullable=True)
    
    # Trial and subscription fields
    trial_start_date = db.Column(db.DateTime, default=datetime.utcnow)
    subscription_active = db.Column(db.Boolean, default=False)
    subscription_end_date = db.Column(db.DateTime, nullable=True)
    stripe_customer_id = db.Column(db.String, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to CVs
    cvs = db.relationship('CV', backref='user', lazy=True, cascade='all, delete-orphan')
    
    @property
    def is_trial_active(self):
        """Check if user's 7-day trial is still active"""
        if self.subscription_active:
            return False
        trial_end = self.trial_start_date + timedelta(days=7)
        return datetime.utcnow() < trial_end
    
    @property
    def trial_days_left(self):
        """Get number of trial days remaining"""
        if self.subscription_active:
            return 0
        trial_end = self.trial_start_date + timedelta(days=7)
        days_left = (trial_end - datetime.utcnow()).days
        return max(0, days_left)
    
    @property
    def can_create_cv(self):
        """Check if user can create CVs (trial active or subscribed)"""
        return self.is_trial_active or self.subscription_active

# (IMPORTANT) This table is mandatory for auth0 Auth, don't drop it.
class OAuth(OAuthConsumerMixin, db.Model):
    user_id = db.Column(db.String, db.ForeignKey(User.id))
    browser_session_key = db.Column(db.String, nullable=False)
    user = db.relationship(User)

    __table_args__ = (UniqueConstraint(
        'user_id',
        'browser_session_key',
        'provider',
        name='uq_user_browser_session_key_provider',
    ),)

class CV(db.Model):
    __tablename__ = 'cvs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    
    # CV Basic Info
    title = db.Column(db.String(200), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    summary = db.Column(db.Text, nullable=True)
    
    # Professional Links
    website_url = db.Column(db.String(200), nullable=True)
    linkedin_url = db.Column(db.String(200), nullable=True)
    github_url = db.Column(db.String(200), nullable=True)
    
    # CV Content (stored as JSON-like text)
    experience = db.Column(db.Text, nullable=True)  # JSON string
    education = db.Column(db.Text, nullable=True)   # JSON string
    skills = db.Column(db.Text, nullable=True)      # JSON string
    projects = db.Column(db.Text, nullable=True)    # JSON string
    
    # QR Code and sharing
    public_url_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    qr_code_path = db.Column(db.String(200), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, **kwargs):
        super(CV, self).__init__(**kwargs)
        if not self.public_url_id:
            self.public_url_id = str(uuid.uuid4())
