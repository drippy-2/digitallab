from dotenv import load_dotenv
load_dotenv()
from app import app
import routes  # Import all the routes (this registers them)

# Load environment variables from .env file

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
