import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

// Logo, social links and the link columns.
export function LandingFooter() {
    return (
        <footer className="bg-gray-900 dark:bg-black text-white p-4 py-20 sm:p-16">
            <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row justify-center items-center gap-16">
                {/* Left Section: Logo, Desc, Social */}
                <div className="flex-1 w-full">
                    <div className="flex items-center mb-6">
                        <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center mr-3">
                            <span className="text-xl font-bold text-white">V</span>
                        </div>
                        <span className="text-2xl font-bold text-white">V-Menu</span>
                    </div>
                    <p className="text-gray-400 mb-6 max-w-md">
                        Modern restaurant management software that streamlines operations, reduces errors, and enhances the dining
                        experience.
                    </p>
                    <div className="flex space-x-4">
                        {["twitter", "facebook", "instagram", "linkedin"].map((social) => (
                            <a
                                key={social}
                                href="#"
                                className="h-10 w-10 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            >
                                <span className="sr-only">{social}</span>
                                {
                                    {
                                        twitter: <Twitter className="h-5 w-5" />,
                                        facebook: <Facebook className="h-5 w-5" />,
                                        instagram: <Instagram className="h-5 w-5" />,
                                        linkedin: <Linkedin className="h-5 w-5" />,
                                    }[social]
                                }
                            </a>
                        ))}
                    </div>
                </div>

                {/* Right Section: Link Columns */}
                <div className="flex flex-wrap sm:flex-row gap-12 lg:gap-12 flex-1 justify-between w-full">
                    {[
                        { title: "Product", items: ["Features", "Pricing", "Integrations", "Updates", "Roadmap"] },
                        { title: "Company", items: ["About Us", "Careers", "Press", "Partners", "Contact"] },
                        {
                            title: "Resources",
                            items: ["Documentation", "Tutorials", "Blog", "Support Center", "API Docs"],
                        },
                    ].map((section) => (
                        <div key={section.title}>
                            <h3 className="text-lg font-semibold text-white mb-6">{section.title}</h3>
                            <ul className="space-y-4">
                                {section.items.map((item) => (
                                    <li key={item}>
                                        <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Footer */}
            <div className="border-t border-gray-800 pt-8 mt-16">
                <div className="max-w-7xl mx-auto px-6  flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                    <p>© {new Date().getFullYear()} V-Menu. All rights reserved.</p>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                        <a href="#" className="hover:text-blue-400 transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="hover:text-blue-400 transition-colors">
                            Terms of Service
                        </a>
                        <a href="#" className="hover:text-blue-400 transition-colors">
                            Cookie Policy
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
