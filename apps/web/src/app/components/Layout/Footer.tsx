function Footer() {
  return (
    <footer className="bg-black text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">TennisCoach</h3>
            <p className="text-gray-400">
              Professional tennis coaching platform connecting players with certified coaches.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/" className="hover:text-orange-500 transition-colors">Home</a></li>
              <li><a href="/booking-types" className="hover:text-orange-500 transition-colors">Services</a></li>
              <li><a href="/register" className="hover:text-orange-500 transition-colors">Sign Up</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <p className="text-gray-400">
              Email: info@tenniscoach.com<br />
              Phone: (555) 123-4567
            </p>
          </div>
        </div>
        <hr className="border-gray-800 my-8" />
        <p className="text-center text-gray-400">
          © 2025 TennisCoach Platform. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
