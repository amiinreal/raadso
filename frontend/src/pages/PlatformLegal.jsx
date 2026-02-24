import React, { useState, useEffect } from 'react'
import { api } from '../api/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

// Define components outside of the render function to prevent re-renders
const markdownComponents = {
    iframe: ({node, ...props}) => {
        // Fix React warnings for boolean attributes passed as strings
        const { 
            allowfullscreen, 
            allowFullScreen,
            frameborder, 
            frameBorder,
            autoplay,
            autoPlay,
            loop,
            muted,
            controls,
            ...rest 
        } = props
        
        const safeProps = { ...rest }
        
        // Normalize allowFullScreen
        if (
            allowfullscreen === 'true' || allowfullscreen === '' || 
            allowFullScreen === 'true' || allowFullScreen === ''
        ) {
            safeProps.allowFullScreen = true
        }
        
        // Normalize frameBorder
        if (frameborder || frameBorder) {
            safeProps.frameBorder = Number(frameborder || frameBorder)
        }

        // Normalize other media booleans
        if (autoplay === 'true' || autoplay === '' || autoPlay === 'true' || autoPlay === '') safeProps.autoPlay = true
        if (loop === 'true' || loop === '') safeProps.loop = true
        if (muted === 'true' || muted === '') safeProps.muted = true
        if (controls === 'true' || controls === '') safeProps.controls = true

        return (
            <div className="my-8">
                <iframe 
                    {...safeProps} 
                    loading="lazy"
                    className="w-full aspect-video rounded-xl shadow-lg border border-gray-200" 
                />
            </div>
        )
    },
    img: ({node, ...props}) => (
        <img {...props} className="rounded-xl shadow-md border border-gray-100 my-6" />
    )
}

export function PlatformLegal() {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.getPrivacyPolicy()
            .then(res => setContent(res.content))
            .catch(err => console.error('Failed to fetch privacy policy', err))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-16 max-w-6xl text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Privacy Policy</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        We are transparent about your data. Learn how we collect, use, and protect your information.
                    </p>
                </div>
            </div>
            
            <main className="flex-grow container mx-auto px-4 py-12 max-w-6xl">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
                    {loading ? (
                        <div className="animate-pulse space-y-6">
                            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
                            <div className="space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                            </div>
                            <div className="h-32 bg-gray-100 rounded-xl w-full"></div>
                        </div>
                    ) : (
                        <article className="prose prose-lg prose-slate max-w-none prose-headings:font-display prose-headings:font-bold prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-xl prose-img:shadow-md">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                rehypePlugins={[rehypeRaw]}
                                components={markdownComponents}
                            >
                                {content}
                            </ReactMarkdown>
                        </article>
                    )}
                </div>
                
                <div className="mt-12 text-center text-sm text-gray-500">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                </div>
            </main>
        </div>
    )
}
