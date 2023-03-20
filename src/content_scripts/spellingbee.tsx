import { useCallback, useEffect, useState } from "react"
import ReactDOM from "react-dom"

export const SPELLING_BEE_CONTENT_AREA = "spelling-bee-content-area"

const SpellingBee = () => {
    const [requiredWordLengths, setRequiredWordLengths] =
        useState(new Array<number>())

    const [requiredLetterCounts, setRequiredLetterCounts] =
        useState(new Map<string, Map<number, number>>())
    const [foundLetterCounts, setFoundLetterCounts] =
        useState(new Map<string, Map<number, number>>())

    const [requiredTwoLetterCounts, setRequiredTwoLetterCounts] =
        useState(new Map<string, number>())
    const [foundTwoLetterCounts, setFoundTwoLetterCounts] =
        useState(new Map<string, number>())

    const WatchEnterButton = useCallback(() => {
        const submitButton =
            document.getElementsByClassName("hive-action__submit")
        if (submitButton == null || submitButton.length !== 1) {
            console.log("Failed to find submit button.")
            return
        }

        const observer = new MutationObserver((mutation) => {
            const submitButtonTarget = mutation[0].target as Element
            if (submitButtonTarget.classList.contains("push-active") ||
                submitButtonTarget.classList.contains("action-active")) {
                UpdateFoundWords()
            }
        })

        observer.observe(submitButton[0], {
            attributes: true,
            attributeFilter: ["class"],
            childList: false,
            characterData: false
        })
    }, [])

    const FetchData = useCallback(async function() {
        try {
            const response = await fetch(
                `https://www.nytimes.com/${CurrentDate()}/crosswords/spelling-bee-forum.html`
            )
            if (!response.ok) {
                throw new Error(`HTTPS error status: ${response.status}`)
            }

            const html = await response.text()

            const parser = new DOMParser()
            const doc = parser.parseFromString(html, "text/html")

            const interactiveBody =
                doc.getElementsByClassName("interactive-body")
            if (interactiveBody == null || interactiveBody.length !== 1) {
                console.log("Failed to find interactive body.")
                return
            }

            ParseSpellingBeeGrid(interactiveBody[0])
            ParseTwoLetterList(interactiveBody[0])
        } catch (error) {
            console.error(error);
        }
    }, [])

    const Update = useCallback(async () => {
        await FetchData()
        UpdateFoundWords()
    }, [FetchData])

    useEffect(() => {
        Update()
        WatchEnterButton()
    }, [WatchEnterButton, Update])

    const UpdateFoundWords = () => {
        const wordList = document.getElementsByClassName("sb-has-words")
        if (wordList == null) {
            console.log("Failed to find word list.")
            return
        }

        const words = wordList[0].getElementsByClassName("sb-anagram")
        if (words == null) {
            console.log("Failed to find words in word list.")
            return
        }

        const letterCounts = new Map<string, Map<number, number>>()
        const twoLetterCounts = new Map<string, number>()

        for (let index = 0; index < words.length; index++) {
            const child = words[index]

            const word = child.innerHTML
            const firstLetter = word[0]

            if (!letterCounts.has(firstLetter)) {
                letterCounts.set(firstLetter, new Map<number, number>())
            }

            if (!letterCounts.get(firstLetter)?.get(word.length)) {
                letterCounts.get(firstLetter)?.set(word.length, 0)
            }

            const letterCount =
                letterCounts.get(firstLetter)?.get(word.length) ?? 0
            letterCounts.get(firstLetter)?.set(word.length, letterCount + 1)

            const firstTwoLetters = word[0] + word[1]
            if (!twoLetterCounts.has(firstTwoLetters)) {
                twoLetterCounts.set(firstTwoLetters, 0)
            }

            const twoLetterCount = twoLetterCounts.get(firstTwoLetters) ?? 0
            twoLetterCounts.set(firstTwoLetters, twoLetterCount + 1)
        }

        setFoundLetterCounts(letterCounts)
        setFoundTwoLetterCounts(twoLetterCounts)
    }

    const CurrentDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}/${month}/${day}`;
    }

    const ParseSpellingBeeGrid = (interactiveBody: Element) => {
        const grid = interactiveBody.getElementsByTagName("table")
        if (grid == null || grid.length !== 1) {
            console.log("Failed to find Spelling Bee Grid.")
            return [new Set<number>(), new Map<string, Array<number>>()]
        }

        const rows = grid[0].getElementsByTagName("tr")

        const wordLengths = new Array<number>()

        const wordCountCells = rows[0].getElementsByTagName("td")
        for (let i = 0; i < wordCountCells.length; i++) {
            const data = wordCountCells[i].textContent?.trim() ?? ""
            if (data === "-") {
                wordLengths.push(0)
            } else if (data.length > 0 && !isNaN(Number(data))) {
                wordLengths.push(Number(data))
            }
        }

        const letterCounts = new Map<string, Map<number, number>>()

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].getElementsByTagName("td")
            const rowLetter = row[0].textContent?.trim().replace(":", "") ?? ""
            if (rowLetter?.length === 0) {
                console.log("Failed to get row letter.")
                continue
            }

            letterCounts.set(rowLetter, new Map<number, number>())

            for (let j = 1; j < row.length; j++) {
                const data = row[j].textContent?.trim() ?? ""
                if (data === "-") {
                    letterCounts.get(rowLetter)!.set(wordLengths[j - 1], 0)
                } else if (data.length > 0 && !isNaN(Number(data))) {
                    letterCounts
                        .get(rowLetter)!
                        .set(wordLengths[j - 1], Number(data))
                }
            }
        }

        setRequiredWordLengths(wordLengths)
        setRequiredLetterCounts(letterCounts)
    }

    const ParseTwoLetterList = (interactiveBody: Element) => {
        const pElements = interactiveBody.getElementsByTagName("p")
        if (pElements === null || pElements.length === 0) {
            console.log("Failed to find two letter list.")
            return new Map<string, number>()
        }

        const twoLetterList = pElements[pElements.length - 1]
            .getElementsByTagName("span")

        const twoLetterCounts = new Map<string, number>()
        for (let i = 0; i < twoLetterList.length; i++) {
            const data = twoLetterList[i].textContent?.trim() ?? ""
            const splitData = data.split(" ")

            for (let j = 0; j < splitData.length; j++) {
                const itemCount = splitData[j].split("-")
                if (itemCount.length !== 2) {
                    console.log("Invalid two letter count: " + splitData[j])
                    continue
                }

                twoLetterCounts.set(itemCount[0], Number(itemCount[1]))
            }
        }

        setRequiredTwoLetterCounts(twoLetterCounts)
    }

    const CalculateWordCount = () => {
        const updatedCounters = new Map<string, Map<number, number>>()

        requiredLetterCounts.forEach((counts, letter) => {
            const updatedLetterCounts = new Map<number, number>()
            counts.forEach((count, wordLength) => {
                const foundCount =
                    foundLetterCounts.get(letter)?.get(wordLength) ?? 0
                updatedLetterCounts.set(wordLength, count - foundCount)
            })

            updatedCounters.set(letter, updatedLetterCounts)
        })

        return <>
            {Array.from(updatedCounters).sort().map(([letter, counts]) => (
                <>
                    <tr>
                        <td className="cell">{letter}</td>
                        {Array.from(counts).map(([wordLength, count]) => (
                            <td className="cell">{count}</td>
                        ))}
                    </tr>
                </>
            ))}
        </>
    }

    const CalculateTwoLetterCount = () => {
        const updatedCounters = new Map<string, number>()

        requiredTwoLetterCounts.forEach((count, letters) => {
            const foundCount = foundTwoLetterCounts.get(letters) ?? 0
            updatedCounters.set(letters, count - foundCount)
        })

        return <>
            <ul>
                {Array.from(updatedCounters).sort().map(([letters, count]) => (
                    <>
                        <li>
                            <span className="bold">{letters}: &nbsp;</span>
                            {count}
                        </li>
                    </>
                ))}
            </ul>
        </>
    }

    const SpellingBeeGrid = () => {
        return <table className="table">
            <tbody>
                <tr className="row">
                    <>
                        <td className="cell"></td>
                        {Array.from(requiredWordLengths).map(value => (
                            <td className="cell">{value}</td>
                        ))}
                    </>
                    <td className="cell">Σ</td>
                </tr>
                <CalculateWordCount />
            </tbody>
        </table>
    }

    return <>
        <span className="spelling-bee-helper-header">
            Spelling Bee Helper
        </span>

        <SpellingBeeGrid />

        <CalculateTwoLetterCount />

        <button onClick={Update}>Update</button>
    </>
}

const Render = () => {
    const contentBox = document.getElementsByClassName("sb-content-box")
    if (contentBox == null || contentBox.length !== 1) {
        console.log("Failed to find content box.")
        return
    }

    const wordListWindow = document.createElement("div")
    wordListWindow.setAttribute("class", SPELLING_BEE_CONTENT_AREA)
    wordListWindow.setAttribute("id", SPELLING_BEE_CONTENT_AREA)

    contentBox[0].appendChild(wordListWindow)

    ReactDOM.render(
        <SpellingBee />,
        document.getElementById(SPELLING_BEE_CONTENT_AREA)
    )
}

console.log("Loading Spelling Bee Helper.")
Render()

export default SpellingBee