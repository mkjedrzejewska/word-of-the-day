const axios = require('axios')

const hook = 'T1192U9B4/B013R0CF2H3/BQWBiYadgT23swOdqm0X3dt9'

const getData = async function() {
    const json = await axios({
        url: 'https://next.json-generator.com/api/json/get/V1clUVS9u',
    })

    return json.data.map(person => ({
        age: person.age,
        email: person.email,
        firstName: person.name.first,
        lastName: person.name.last,
    }))
}

const main = async () => {
    try {
        // get the data
        const people = await getData()

        const slackBody = {
            mkdwn: true, // slack markdown
            text: 'Test message!',
            attachments: people.map(person => ({
                color: 'good',
                text: `*${person.email}* and their name is ${person.firstName}`,
            }))
        }

        //post to slack
        const res = await axios({
            url: `https://hooks.slack.com/services/${hook}`,
            method: 'POST',
            data: slackBody,
        })

        console.log(res)

    } catch (e) {
        console.log('error', e)
    }
}

main()
