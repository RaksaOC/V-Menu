import {MoreHorizontal, MoreVertical, Settings} from "lucide-react";
import {Menu as LucideMenu} from "lucide-react";
import {Menu, MenuButton} from "@headlessui/react";
import {Link} from "react-router"

export default function Header() {
    return (
        <div
            className="header w-full flex bg-zinc-900  items-center justify-center mb-6 sticky top-0 right-0 left-0 p-2.5 z-50">
            <div className="header-wrapper flex justify-between max-w-[1024px] w-full">
                <h1 className="text-2xl font-bold">V-Menu Admin</h1>

                <Menu as="div" className="relative">
                    <Menu.Button className="flex gap-2.5 cursor-pointer focus:outline-none">
                        <LucideMenu size={30} className="text-white"/>
                    </Menu.Button>

                    <Menu.Items
                        className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg focus:outline-none z-50">
                        <div className="py-1 flex flex-col items-center justify-between">
                            <Menu.Item>
                                {({active}) => (
                                    <Link to="/settings" state={{section: "menus"}}
                                          className={`${
                                              active ? 'bg-gray-100' : ''
                                          } w-full text-left px-4 py-2 text-sm text-gray-700`}
                                    >
                                        Manage Menu
                                    </Link>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({active}) => (
                                    <Link to="/settings" state={{section: "tables"}}
                                          className={`${
                                              active ? 'bg-gray-100' : ''
                                          } w-full text-left px-4 py-2 text-sm text-gray-700`}
                                    >
                                        Manage Table
                                    </Link>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({active}) => (
                                    <Link to="/settings" state={{section: "preferences"}}
                                          className={`${
                                              active ? 'bg-gray-100' : ''
                                          } w-full text-left px-4 py-2 text-sm text-gray-700`}
                                    >
                                        Preferences
                                    </Link>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({active}) => (
                                    <Link to="/settings" state={{section: "menu"}}
                                          className={`${
                                              active ? 'bg-gray-100' : ''
                                          } w-full text-left px-4 py-2 text-sm text-gray-700`}
                                    >
                                        Log Out
                                    </Link>
                                )}
                            </Menu.Item>
                        </div>
                    </Menu.Items>
                </Menu>
            </div>
        </div>
    );
}
