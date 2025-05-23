import "./globals.css";



export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <head>
            <title>V-Menu</title>
            <link rel="icon" type="image/png" href="/favicon.png" />
        </head>
        <body
        >
            {children}
        </body>
        </html>
    );
}
