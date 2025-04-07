import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-blue-500 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link 
          to="/" 
          className="text-xl font-bold"
        >
          BookMyDrive
        </Link>

        <div>
          <Link 
            to="/user" 
            className="mx-2 hover:text-gray-200"
          >
            User
          </Link>

          <Link 
            to="/manager" 
            className="mx-2 hover:text-gray-200"
          >
            Manager
          </Link>

          <Link 
            to="/security" 
            className="mx-2 hover:text-gray-200"
          >
            Security
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;