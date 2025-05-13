import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
    return (
        <div className="min-h-[calc(100vh-160px)] flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Página Não Encontrada</h2>
            <p className="text-gray-600 mb-6">
                Oops! A página que você está procurando não existe ou foi movida.
            </p>
            <img src="/undraw_page_not_found_re_e9o6.svg" alt="Página não encontrada" className="max-w-xs md:max-w-sm mb-8" /> {/* Você precisaria adicionar este SVG à sua pasta public */}
            <Link 
                to="/"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out text-lg"
            >
                Voltar para o Dashboard
            </Link>
        </div>
    );
};

export default NotFoundPage;

