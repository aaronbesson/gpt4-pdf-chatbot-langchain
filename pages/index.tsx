import Layout from '@/components/layout';
import LoadingDots from '@/components/ui/LoadingDots';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import styles from '@/styles/Home.module.css';
import { Message } from '@/types/chat';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Document } from 'langchain/document';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import content from '../content.json';

export default function Home() {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sourceDocs, setSourceDocs] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [messageState, setMessageState] = useState<{
    messages: Message[];
    pending?: string;
    history: [string, string][];
    pendingSourceDocs?: Document[];
  }>({
    messages: [
      {
        message: 'Hi, what would you like to learn about the 2023 budget? Type a question or click on any of the Hot Topics and hit enter to learn more.',
        type: 'apiMessage',
      },
    ],
    history: [],
    pendingSourceDocs: [],
  });

  const { messages, pending, history, pendingSourceDocs } = messageState;

  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);

  //handle form submission
  async function handleSubmit(e: any) {
    e.preventDefault();
    setError(null);
    if (!query) {
      alert('Please input a question');
      return;
    }
    const question = query.trim();
    setMessageState((state) => ({
      ...state,
      messages: [
        ...state.messages,
        {
          type: 'userMessage',
          message: question,
        },
      ],
      pending: undefined,
    }));

    setLoading(true);
    setQuery('');
    setMessageState((state) => ({ ...state, pending: '' }));
    const ctrl = new AbortController();
    try {
      fetchEventSource('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          history,
        }),
        signal: ctrl.signal,
        onmessage: (event) => {
          if (event.data === '[DONE]') {
            setMessageState((state) => ({
              history: [...state.history, [question, state.pending ?? '']],
              messages: [
                ...state.messages,
                {
                  type: 'apiMessage',
                  message: state.pending ?? '',
                  sourceDocs: state.pendingSourceDocs,
                },
              ],
              pending: undefined,
              pendingSourceDocs: undefined,
            }));
            setLoading(false);
            ctrl.abort();
          } else {
            const data = JSON.parse(event.data);
            if (data.sourceDocs) {
              setMessageState((state) => ({
                ...state,
                pendingSourceDocs: data.sourceDocs,
              }));
            } else {
              setMessageState((state) => ({
                ...state,
                pending: (state.pending ?? '') + data.data,
              }));
            }
          }
        },
      });
    } catch (error) {
      setLoading(false);
      setError('An error occurred while fetching the data. Please try again.');
      console.log('error', error);
    }
  }

  //prevent empty submissions
  const handleEnter = useCallback(
    (e: any) => {
      if (e.key === 'Enter' && query) {
        handleSubmit(e);
      } else if (e.key == 'Enter') {
        e.preventDefault();
      }
    },
    [query],
  );

  const chatMessages = useMemo(() => {
    return [
      ...messages,
      ...(pending
        ? [
            {
              type: 'apiMessage',
              message: pending,
              sourceDocs: pendingSourceDocs,
            },
          ]
        : []),
    ];
  }, [messages, pending, pendingSourceDocs]);

  //scroll to bottom of chat
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <>
      <Layout>
        <div className="mx-auto flex flex-col gap-4">


            <div className="flex flex-col md:flex-row gap-4">
              <div className='w-full'>
                <div className={styles.cloud}>
                  <div ref={messageListRef} className={styles.messagelist}>
                    {chatMessages.map((message, index) => {
                      var urlRegex = /(https?:\/\/[^\s]+)/g;

                      let icon;
                      let className;
                      if (message.type === 'apiMessage') {
                        icon = <div className="text-3xl pr-2">🤖</div>;
                        className = styles.apimessage;
                      } else {
                        icon = <div className="text-3xl pr-2">🧑🏾‍💼</div>;
                        // The latest message sent by the user will be animated while waiting for a response
                        className =
                          loading && index === chatMessages.length - 1
                            ? styles.usermessagewaiting
                            : styles.usermessage;
                      }
                      return (
                        <>
                          <div
                            key={`chatMessage-${index}`}
                            className={className}
                          >
                            {icon}
                            <div className={styles.markdownanswer}>
                              <ReactMarkdown linkTarget="_blank">
                                {message.message.replace(urlRegex, '[$1]($1)')}
                              </ReactMarkdown>
                            </div>
                          </div>
                          {message.sourceDocs && (
                            <div className="p-5">
                              <Accordion
                                type="single"
                                collapsible
                                className="flex-col"
                              >
                                {message.sourceDocs.map((doc, index) => (
                                  <div key={`messageSourceDocs-${index}`}>
                                    <AccordionItem value={`item-${index}`}>
                                      <AccordionTrigger>
                                        <h3 className="text-sm text-gray-500">
                                          Reference {index + 1}
                                        </h3>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <p className="text-gray-400 pr-3 py-3 text-xs text-justify">
                                          {doc.pageContent.replace(
                                            /[\n\r\t\s]+/g,
                                            ' ',
                                          )}
                                        </p>
                                        <p className="mt-2 text-xs text-blue-500">
                                          <a
                                            href="https://www.finance.gov.tt/wp-content/uploads/2022/09/Budget-Statement-2023-E-Version.pdf"
                                            target="_blank"
                                          >
                                            <b>View source document</b>
                                          </a>
                                        </p>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </div>
                                ))}
                              </Accordion>
                            </div>
                          )}
                        </>
                      );
                    })}
                    {sourceDocs.length > 0 && (
                      <div className="p-5">
                        <Accordion
                          type="single"
                          collapsible
                          className="flex-col"
                        >
                          {sourceDocs.map((doc, index) => (
                            <div key={`sourceDocs-${index}`}>
                              <AccordionItem value={`item-${index}`}>
                                <AccordionTrigger>
                                  <h3>Source {index + 1}</h3>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <ReactMarkdown linkTarget="_blank">
                                    {doc.pageContent}
                                  </ReactMarkdown>
                                </AccordionContent>
                              </AccordionItem>
                            </div>
                          ))}
                        </Accordion>
                      </div>
                    )}
                  </div>
                </div>
                <div className='p-3 w-full'>
                  <div className={styles.cloudform}>
                    <form onSubmit={handleSubmit}>
                      <textarea
                        disabled={loading}
                        onKeyDown={handleEnter}
                        ref={textAreaRef}
                        autoFocus={false}
                        rows={1}
                        maxLength={1000}
                        id="userInput"
                        name="userInput"
                        placeholder={
                          loading
                            ? 'Waiting for response...'
                            : 'What would you like to know about the 2023 budget?'
                        }
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className={styles.textarea}
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className={styles.generatebutton}
                      >
                        {loading ? (
                          <div className={styles.loadingwheel}>
                            <LoadingDots color="#000" />
                          </div>
                        ) : (
                          // Send icon SVG in input field
                          <svg
                            viewBox="0 0 20 20"
                            className={styles.svgicon}
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                          </svg>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                <footer className="m-auto p-4 text-xs  text-gray-400">
          <a
            href="https://www.finance.gov.tt/wp-content/uploads/2022/09/Budget-Statement-2023-E-Version.pdf"
            target="_blank"
          >
            Reference Document: Trinidad and Tobago Budget Statement 2023
          </a>
          <br />
          <a href="https://www.bespokett.com" target="_blank">
            by: Aaron Besson @ BespokeTT.com
          </a>
          <br />
          <br />
          <a href="mailto:aaronbesson@gmail.com" target="_blank">
            Do you need something like this for your business? Get in Touch!
          </a>
        </footer>
              </div>
              <div>
                <h2 className="text-lg font-bold pb-4 px-6 md:px-0">Hot Topics</h2>
                <div className="max-h-[45%] overflow-y-scroll px-6 md:px-0">
                {content.map((item, index) => (
                  <div
                    onClick={() => {
                      setQuery(item.title);
                    }}
                    key={index}
                    className="flex flex-col gap-4 text-sm cursor-pointer hover:underline"
                  >
                    {item.title}
                  </div>
                ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="border border-red-400 rounded-md p-4">
                <p className="text-red-500">{error}</p>
              </div>
            )}
  
        </div>
      
      </Layout>
    </>
  );
}
